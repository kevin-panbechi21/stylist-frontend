import React from "react";
import { act, cleanup, render } from "@testing-library/react-native";
import { ReduceMotion } from "react-native-reanimated";
import { motion } from "@/design/tokens";
import SwipeCard from "./SwipeCard";

let mockTimingCalls = [];
let mockGestureHandlers = {};
let mockCancelAnimation;
let mockWithSpring;

jest.mock("react-native-reanimated", () => {
  const reanimated = jest.requireActual("react-native-reanimated/mock");
  return {
    ...reanimated,
    default: reanimated.default,
    withTiming: jest.fn((toValue, config, callback) => {
      mockTimingCalls.push({ toValue, config, callback });
      return toValue;
    }),
    runOnJS: (callback) => callback,
    cancelAnimation: (...args) => mockCancelAnimation(...args),
    withSpring: (...args) => mockWithSpring(...args),
  };
});

jest.mock("react-native-gesture-handler", () => {
  const React = require("react");

  const makeGesture = (kind) => {
    const gesture = {};
    for (const method of [
      "enabled",
      "maxDuration",
      "cancelsTouchesInView",
      "requireExternalGestureToFail",
    ]) {
      gesture[method] = jest.fn(() => gesture);
    }
    gesture.onBegin = jest.fn((callback) => {
      mockGestureHandlers[`${kind}Begin`] = callback;
      return gesture;
    });
    gesture.onUpdate = jest.fn((callback) => {
      mockGestureHandlers[`${kind}Update`] = callback;
      return gesture;
    });
    gesture.onEnd = jest.fn((callback) => {
      mockGestureHandlers[kind] = callback;
      return gesture;
    });
    gesture.onFinalize = jest.fn((callback) => {
      mockGestureHandlers[`${kind}Finalize`] = callback;
      return gesture;
    });
    return gesture;
  };

  return {
    GestureDetector: ({ children }) =>
      React.createElement(React.Fragment, null, children),
    Gesture: {
      Pan: () => makeGesture("pan"),
      Tap: () => makeGesture("tap"),
      Race: (primary) => primary,
    },
  };
});

jest.mock("expo-image", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { Image: (props) => React.createElement(View, props) };
});

jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    LinearGradient: ({ children, ...props }) =>
      React.createElement(View, props, children),
  };
});

const product = {
  id: "p-motion",
  brand: "Stylist Test",
  title: "Editorial Jacket",
  price: 198,
  currency: "USD",
  category: "outerwear",
  image: "https://images.example.com/jacket.jpg",
};

async function renderCard(overrides = {}) {
  const props = {
    product,
    isTop: true,
    index: 0,
    onSwipeLeft: jest.fn(),
    onSwipeRight: jest.fn(),
    onSwipeUp: jest.fn(),
    onSwipeAnimationStart: jest.fn(),
    onSwipeAnimationComplete: jest.fn(),
    onSwipeAnimationCancel: jest.fn(),
    ...overrides,
  };

  return { props, view: await render(<SwipeCard {...props} />) };
}

function completionCall() {
  const call = mockTimingCalls.find(
    ({ callback }) => typeof callback === "function",
  );
  expect(call).toBeDefined();
  return call;
}

describe("SwipeCard motion behavior", () => {
  beforeEach(() => {
    mockTimingCalls = [];
    mockGestureHandlers = {};
    mockCancelAnimation = jest.fn();
    mockWithSpring = jest.fn((toValue) => toValue);
  });

  afterEach(async () => {
    await cleanup();
  });

  it.each([
    ["left", "onSwipeLeft"],
    ["right", "onSwipeRight"],
    ["up", "onSwipeUp"],
  ])(
    "finishes a visible %s button exit on the approved fast token before settling once",
    async (direction, callbackName) => {
      const externalSwipe = {
        direction,
        productId: product.id,
        token: 17,
        animationToken: `button:session:${product.id}:17`,
      };
      const { props, view } = await renderCard({ externalSwipe });

      expect(mockTimingCalls).toHaveLength(2);
      for (const { config } of mockTimingCalls) {
        expect(config).toEqual(
          expect.objectContaining({
            duration: motion.swipeFast,
            reduceMotion: ReduceMotion.System,
          }),
        );
        expect(config.duration).toBeGreaterThanOrEqual(200);
        expect(config.duration).toBeLessThanOrEqual(250);
      }
      expect(props[callbackName]).not.toHaveBeenCalled();
      expect(props.onSwipeAnimationComplete).not.toHaveBeenCalled();

      const exit = completionCall();
      await act(async () => exit.callback(true));

      // The parent accepted/persisted the button choice before rendering this
      // exit command. Completion settles only the exact visual lifecycle.
      expect(props[callbackName]).not.toHaveBeenCalled();
      expect(props.onSwipeAnimationComplete).toHaveBeenCalledTimes(1);
      expect(props.onSwipeAnimationComplete).toHaveBeenCalledWith(
        externalSwipe.animationToken,
      );
      await act(async () => exit.callback(true));
      expect(props[callbackName]).not.toHaveBeenCalled();
      expect(props.onSwipeAnimationComplete).toHaveBeenCalledTimes(1);
      expect(props.onSwipeAnimationCancel).not.toHaveBeenCalled();

      await view.unmount();
      expect(props.onSwipeAnimationCancel).not.toHaveBeenCalled();
    },
  );

  it("cancels an unfinished button exit once and ignores a late timing callback", async () => {
    const externalSwipe = {
      direction: "right",
      productId: product.id,
      token: 23,
      animationToken: `button:session:${product.id}:23`,
    };
    const { props, view } = await renderCard({ externalSwipe });
    const exit = completionCall();

    await view.rerender(<SwipeCard {...props} externalSwipe={null} />);

    expect(props.onSwipeAnimationCancel).toHaveBeenCalledTimes(1);
    expect(props.onSwipeAnimationCancel).toHaveBeenCalledWith(
      externalSwipe.animationToken,
      externalSwipe.token,
    );
    expect(mockCancelAnimation).toHaveBeenCalledTimes(2);

    await act(async () => exit.callback(true));
    await act(async () => exit.callback(false));
    expect(props.onSwipeRight).not.toHaveBeenCalled();
    expect(props.onSwipeAnimationComplete).not.toHaveBeenCalled();
    expect(props.onSwipeAnimationCancel).toHaveBeenCalledTimes(1);
  });

  it.each([
    [0, motion.swipeSlow],
    [1400, 290],
    [2800, motion.swipeFast],
  ])(
    "keeps a physical horizontal release at velocity %i on its %ims trajectory",
    async (velocityX, expectedDuration) => {
      const { props } = await renderCard();

      await act(async () =>
        mockGestureHandlers.pan({
          translationX: 400,
          translationY: 0,
          velocityX,
          velocityY: 0,
        }, true),
      );

      expect(props.onSwipeAnimationStart).toHaveBeenCalledTimes(1);
      expect(props.onSwipeRight).toHaveBeenCalledTimes(1);
      expect(props.onSwipeRight).toHaveBeenCalledWith(
        product,
        null,
        expect.stringMatching(/^gesture:p-motion:/),
      );
      expect(mockTimingCalls).toHaveLength(2);
      expect(mockTimingCalls.map(({ config }) => config.duration)).toEqual([
        expectedDuration,
        expectedDuration,
      ]);
      expect(expectedDuration).toBeGreaterThanOrEqual(motion.swipeFast);
      expect(expectedDuration).toBeLessThanOrEqual(motion.swipeSlow);

      const exit = completionCall();
      expect(props.onSwipeAnimationComplete).not.toHaveBeenCalled();
      await act(async () => exit.callback(true));
      expect(props.onSwipeRight).toHaveBeenCalledTimes(1);
      expect(props.onSwipeAnimationComplete).toHaveBeenCalledTimes(1);
      await act(async () => exit.callback(true));
      expect(props.onSwipeRight).toHaveBeenCalledTimes(1);
      expect(props.onSwipeAnimationComplete).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    [0, motion.swipeSlow],
    [-1400, 290],
    [-2800, motion.swipeFast],
  ])(
    "keeps a physical upward release at velocity %i on its %ims trajectory",
    async (velocityY, expectedDuration) => {
      const { props } = await renderCard();

      await act(async () =>
        mockGestureHandlers.pan({
          translationX: 0,
          translationY: -140,
          velocityX: 0,
          velocityY,
        }, true),
      );

      expect(props.onSwipeAnimationStart).toHaveBeenCalledTimes(1);
      expect(props.onSwipeUp).toHaveBeenCalledTimes(1);
      expect(props.onSwipeUp).toHaveBeenCalledWith(
        product,
        null,
        expect.stringMatching(/^gesture:p-motion:/),
      );
      expect(mockTimingCalls.map(({ config }) => config.duration)).toEqual([
        expectedDuration,
        expectedDuration,
      ]);
      expect(expectedDuration).toBeGreaterThanOrEqual(motion.swipeFast);
      expect(expectedDuration).toBeLessThanOrEqual(motion.swipeSlow);

      const exit = completionCall();
      expect(props.onSwipeAnimationComplete).not.toHaveBeenCalled();
      await act(async () => exit.callback(true));
      expect(props.onSwipeAnimationComplete).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    ["positive velocity at rest", 0, 1400, "onSwipeRight", "onSwipeLeft"],
    [
      "positive velocity after a small left drift",
      -20,
      1400,
      "onSwipeRight",
      "onSwipeLeft",
    ],
    ["negative velocity at rest", 0, -1400, "onSwipeLeft", "onSwipeRight"],
    [
      "negative velocity after a small right drift",
      20,
      -1400,
      "onSwipeLeft",
      "onSwipeRight",
    ],
    [
      "right displacement despite opposite release velocity",
      400,
      -1400,
      "onSwipeRight",
      "onSwipeLeft",
    ],
    [
      "left displacement despite opposite release velocity",
      -400,
      1400,
      "onSwipeLeft",
      "onSwipeRight",
    ],
  ])(
    "uses %s to choose the exact horizontal action",
    async (
      _caseName,
      translationX,
      velocityX,
      expectedCallback,
      rejectedCallback,
    ) => {
      const { props } = await renderCard();

      await act(async () =>
        mockGestureHandlers.pan({
          translationX,
          translationY: 0,
          velocityX,
          velocityY: 0,
        }, true),
      );

      expect(props[expectedCallback]).toHaveBeenCalledTimes(1);
      expect(props[rejectedCallback]).not.toHaveBeenCalled();
      expect(props.onSwipeAnimationStart).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    ["stops being top", { isTop: false, index: 1 }],
    ["becomes interaction-disabled", { interactionDisabled: true }],
  ])(
    "snaps an unaccepted mid-drag pan back when the card %s",
    async (_caseName, changedProps) => {
      const { props, view } = await renderCard();
      const begin = mockGestureHandlers.panBegin;
      const update = mockGestureHandlers.panUpdate;
      const end = mockGestureHandlers.pan;
      const finalize = mockGestureHandlers.panFinalize;
      const event = { translationX: 400, translationY: 54, velocityX: 900, velocityY: 0 };

      await act(async () => {
        begin({});
        update(event);
      });
      await view.rerender(<SwipeCard {...props} {...changedProps} />);
      mockWithSpring.mockClear();

      await act(async () => {
        end(event, false);
        finalize(event, false);
      });

      expect(mockWithSpring.mock.calls.map(([toValue]) => toValue)).toEqual([
        0,
        0,
      ]);
      expect(mockTimingCalls).toHaveLength(0);
      expect(props.onSwipeAnimationStart).not.toHaveBeenCalled();
      expect(props.onSwipeLeft).not.toHaveBeenCalled();
      expect(props.onSwipeRight).not.toHaveBeenCalled();
      expect(props.onSwipeUp).not.toHaveBeenCalled();
      expect(props.onSwipeAnimationComplete).not.toHaveBeenCalled();
      expect(props.onSwipeAnimationCancel).not.toHaveBeenCalled();
    },
  );

  it("does not let cancellation finalization reverse an accepted exit", async () => {
    const { props } = await renderCard();
    const begin = mockGestureHandlers.panBegin;
    const finalize = mockGestureHandlers.panFinalize;
    mockWithSpring.mockClear();

    await act(async () => {
      begin({});
      mockGestureHandlers.pan({
        translationX: 400,
        translationY: 0,
        velocityX: 1400,
        velocityY: 0,
      }, true);
      finalize({}, false);
    });

    expect(props.onSwipeRight).toHaveBeenCalledTimes(1);
    expect(mockWithSpring).not.toHaveBeenCalled();
    expect(props.onSwipeAnimationComplete).not.toHaveBeenCalled();
    expect(props.onSwipeAnimationCancel).not.toHaveBeenCalled();
  });

  it.each([
    ["right", { translationX: 400, translationY: 0, velocityX: 1400, velocityY: 0 }],
    ["left", { translationX: -400, translationY: 0, velocityX: -1400, velocityY: 0 }],
    ["up", { translationX: 0, translationY: -180, velocityX: 0, velocityY: -1400 }],
  ])("does not accept a canceled active %s pan and keeps the next completed swipe usable", async (direction, event) => {
    const { props } = await renderCard();
    mockWithSpring.mockClear();
    await act(async () => {
      mockGestureHandlers.panBegin(event);
      mockGestureHandlers.panUpdate(event);
      // This is the installed RNGH ACTIVE→CANCELLED/FAILED callback contract.
      mockGestureHandlers.pan(event, false);
      mockGestureHandlers.panFinalize(event, false);
    });
    expect(props.onSwipeAnimationStart).not.toHaveBeenCalled();
    expect(props.onSwipeLeft).not.toHaveBeenCalled();
    expect(props.onSwipeRight).not.toHaveBeenCalled();
    expect(props.onSwipeUp).not.toHaveBeenCalled();
    expect(mockTimingCalls).toHaveLength(0);
    expect(mockWithSpring).toHaveBeenCalledTimes(2);

    await act(async () => {
      mockGestureHandlers.panBegin(event);
      mockGestureHandlers.pan(event, true);
      mockGestureHandlers.panFinalize(event, true);
    });
    const handler = direction === "right" ? props.onSwipeRight
      : direction === "left" ? props.onSwipeLeft : props.onSwipeUp;
    expect(handler).toHaveBeenCalledTimes(1);
    expect(props.onSwipeAnimationStart).toHaveBeenCalledTimes(1);
    expect(mockTimingCalls).toHaveLength(2);
    await act(async () => completionCall().callback(true));
    expect(props.onSwipeAnimationComplete).toHaveBeenCalledTimes(1);
  });

  it("resets a failed physical choice and ignores its late completion", async () => {
    const failedWrite = Promise.reject(new Error("offline"));
    // The rejection is observed by SwipeCard's lifecycle catch below.
    failedWrite.catch(() => {});
    const { props } = await renderCard({
      onSwipeRight: jest.fn(() => failedWrite),
    });

    await act(async () =>
      mockGestureHandlers.pan({
        translationX: 400,
        translationY: 0,
        velocityX: 2800,
        velocityY: 0,
      }, true),
    );
    const exit = completionCall();
    await act(async () => {
      await failedWrite.catch(() => {});
    });

    expect(props.onSwipeRight).toHaveBeenCalledTimes(1);
    expect(props.onSwipeAnimationCancel).toHaveBeenCalledTimes(1);
    expect(mockCancelAnimation).toHaveBeenCalledTimes(2);
    expect(props.onSwipeAnimationComplete).not.toHaveBeenCalled();

    await act(async () => exit.callback(true));
    expect(props.onSwipeRight).toHaveBeenCalledTimes(1);
    expect(props.onSwipeAnimationComplete).not.toHaveBeenCalled();
    expect(props.onSwipeAnimationCancel).toHaveBeenCalledTimes(1);
  });
});
