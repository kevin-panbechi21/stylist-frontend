import { AccessibilityInfo } from "react-native";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react-native";
import { useReducedMotionPreference } from "./useReducedMotionPreference";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

let preferenceChanged: (enabled: boolean) => void;
let remove: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  remove = jest.fn();
  // Replace only the native subscription boundary, whose overloaded production
  // signature also includes unrelated announcement event payloads.
  const subscribe = ((event: string, listener: (enabled: boolean) => void) => {
    expect(event).toBe("reduceMotionChanged");
    preferenceChanged = listener;
    return { remove };
  }) as unknown as typeof AccessibilityInfo.addEventListener;
  jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation(subscribe);
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

describe("device Reduced Motion preference ownership", () => {
  it("defaults to immediate feedback until the initial device read permits motion", async () => {
    const initial = deferred<boolean>();
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(initial.promise);
    const { result } = await renderHook(useReducedMotionPreference);
    expect(result.current).toBe(true);
    await act(async () => { initial.resolve(false); });
    await waitFor(() => expect(result.current).toBe(false));
    await act(async () => { preferenceChanged(true); });
    expect(result.current).toBe(true);
    await act(async () => { preferenceChanged(false); });
    expect(result.current).toBe(false);
  });

  it("does not replace a newer motion-safe event with the older initial result", async () => {
    const initial = deferred<boolean>();
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(initial.promise);
    const { result } = await renderHook(useReducedMotionPreference);
    await act(async () => { preferenceChanged(true); initial.resolve(false); });
    expect(result.current).toBe(true);
  });

  it("does not replace a newer preference with an initial-read failure", async () => {
    const initial = deferred<boolean>();
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(initial.promise);
    const { result } = await renderHook(useReducedMotionPreference);
    await act(async () => { preferenceChanged(false); initial.reject(new Error("native read failed")); });
    expect(result.current).toBe(false);
  });

  it.each(["reject", "throw"])("keeps motion disabled when the device read fails (%s)", async (mode) => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockImplementation(() => {
      if (mode === "throw") throw new Error("native read failed");
      return Promise.reject(new Error("native read failed"));
    });
    const { result } = await renderHook(useReducedMotionPreference);
    await act(async () => {});
    expect(result.current).toBe(true);
  });

  it("keeps motion disabled if device changes cannot be observed", async () => {
    jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation(() => { throw new Error("native subscription failed"); });
    const read = jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    const { result } = await renderHook(useReducedMotionPreference);
    expect(result.current).toBe(true);
    expect(read).not.toHaveBeenCalled();
  });

  it("unsubscribes and ignores an initial read and captured callback after unmount", async () => {
    const initial = deferred<boolean>();
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(initial.promise);
    const { result, unmount } = await renderHook(useReducedMotionPreference);
    await unmount();
    expect(remove).toHaveBeenCalledTimes(1);
    await act(async () => { initial.resolve(false); preferenceChanged(false); });
    expect(result.current).toBe(true);
  });
});
