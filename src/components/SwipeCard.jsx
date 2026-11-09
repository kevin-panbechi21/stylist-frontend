import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Dimensions,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  Easing,
  ReduceMotion,
  cancelAnimation,
} from "react-native-reanimated";
import {
  buildProductAccessibilityLabel,
  formatProductPrice,
} from "@/utils/productPresentation";
import {
  color,
  fontFamilies,
  motion,
  radius,
  spacing,
  type,
} from "@/design/tokens";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_W * 0.3;
const VELOCITY_THRESHOLD = 700;
const UP_THRESHOLD = 110;
const UP_VELOCITY_THRESHOLD = 800;
const VISUAL_VERTICAL_DRAG_SCALE = 0.2;
const TAP_SWIPE_EXIT_DURATION = motion.swipeFast;
const PHYSICAL_SWIPE_FAST_DURATION = motion.swipeFast;
const PHYSICAL_SWIPE_SLOW_DURATION = motion.swipeSlow;

// Spring used for snap-back when not swiped far enough
const SNAP_SPRING = {
  damping: 24,
  stiffness: 260,
  mass: 0.75,
  reduceMotion: ReduceMotion.System,
};

// Spring used for background cards stepping forward
const STACK_SPRING = {
  damping: 20,
  stiffness: 130,
  mass: 0.8,
  reduceMotion: ReduceMotion.System,
};

const TEXT_SHADOW = {
  textShadowColor: "rgba(0,0,0,0.5)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
};

// Physical exit duration stays velocity-driven: fast flick = snappier, slow
// deliberate = longer. Tap commitments use the separate fast token below.
const exitDuration = (velocityX) => {
  "worklet";
  const speed = Math.min(Math.abs(velocityX), 2800);
  return Math.round(
    Math.max(
      PHYSICAL_SWIPE_FAST_DURATION,
      PHYSICAL_SWIPE_SLOW_DURATION -
        (speed / 2800) *
          (PHYSICAL_SWIPE_SLOW_DURATION - PHYSICAL_SWIPE_FAST_DURATION),
    ),
  );
};

export default function SwipeCard({
  product,
  isTop,
  index,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onTap,
  externalSwipe,
  onSwipeAnimationStart,
  onSwipeAnimationComplete,
  onSwipeAnimationCancel,
  interactionDisabled = false,
  personalInsight = null,
  onDismissPersonalInsight,
  contentBottomInset = 132,
  contentTopInset = 112,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const { fontScale } = useWindowDimensions();
  const usesAccessibleCopyLayout = fontScale >= 1.35;
  const copyBottomInset = Math.max(132, contentBottomInset);
  const copyTopInset = Math.max(112, contentTopInset);
  const hasAcceptedSwipeRef = useRef(false);
  const acceptedSwipeRequestRef = useRef(null);
  const activeSwipeAnimationTokenRef = useRef(null);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const gestureAnimationSequence = useSharedValue(0);
  const gestureExitAccepted = useSharedValue(false);

  // animatedIndex allows background cards to spring smoothly when they
  // step forward (e.g., index changes from 1→0 when top card exits)
  const animatedIndex = useSharedValue(index);
  useEffect(() => {
    animatedIndex.value = withSpring(index, STACK_SPRING);
  }, [index]);
  useEffect(() => () => { acceptedSwipeRequestRef.current = null; }, []);

  // Plain JS callbacks — called via runOnJS from the UI thread
  const cancelSwipeAnimation = (animationToken, commandToken = null) => {
    if (typeof animationToken !== "string" || animationToken.length === 0)
      return;
    if (activeSwipeAnimationTokenRef.current !== animationToken) return;
    activeSwipeAnimationTokenRef.current = null;
    acceptedSwipeRequestRef.current = null;
    hasAcceptedSwipeRef.current = false;
    cancelAnimation(translateX);
    cancelAnimation(translateY);
    translateX.value = 0;
    translateY.value = 0;
    onSwipeAnimationCancel?.(animationToken, commandToken);
  };
  const completeSwipeAnimation = (animationToken) => {
    if (
      typeof animationToken !== "string" ||
      activeSwipeAnimationTokenRef.current !== animationToken
    )
      return;
    activeSwipeAnimationTokenRef.current = null;
    onSwipeAnimationComplete?.(animationToken);
  };
  const releaseRefusedSwipe = (requestOwner, animationToken = null) => {
    if (acceptedSwipeRequestRef.current !== requestOwner) return;
    acceptedSwipeRequestRef.current = null;
    hasAcceptedSwipeRef.current = false;
    if (animationToken !== null) {
      // An explicit false means no choice entered persistence. Reduced Motion
      // may already have finished the visual exit; restore this owned card in
      // either order, without letting a late refusal cancel a newer command.
      activeSwipeAnimationTokenRef.current = null;
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      translateX.value = 0;
      translateY.value = 0;
      onSwipeAnimationCancel?.(animationToken, null);
    }
  };
  const acceptSwipeAnimation = (direction, animationToken) => {
    if (
      typeof animationToken !== "string" ||
      animationToken.length === 0 ||
      activeSwipeAnimationTokenRef.current !== null ||
      hasAcceptedSwipeRef.current
    )
      return;
    const handler =
      direction === "right"
        ? onSwipeRight
        : direction === "left"
          ? onSwipeLeft
          : onSwipeUp;
    if (typeof handler !== "function") return;

    activeSwipeAnimationTokenRef.current = animationToken;
    hasAcceptedSwipeRef.current = true;
    const requestOwner = {};
    acceptedSwipeRequestRef.current = requestOwner;
    if (onSwipeAnimationStart?.(animationToken) === false) {
      cancelSwipeAnimation(animationToken);
      return;
    }
    let request;
    try {
      request = handler(product, null, animationToken);
    } catch {
      cancelSwipeAnimation(animationToken);
      return;
    }
    Promise.resolve(request).then(
      (result) => { if (result === false) releaseRefusedSwipe(requestOwner, animationToken); },
      () => cancelSwipeAnimation(animationToken),
    );
  };
  const triggerAccessibleSwipe = (handler) => {
    if (hasAcceptedSwipeRef.current || typeof handler !== "function") return;
    hasAcceptedSwipeRef.current = true;
    const requestOwner = {};
    acceptedSwipeRequestRef.current = requestOwner;
    let request;
    try {
      request = handler(product);
    } catch {
      releaseRefusedSwipe(requestOwner);
      return;
    }
    Promise.resolve(request).then(
      (result) => { if (result === false) releaseRefusedSwipe(requestOwner); },
      // The parent owns errors after acceptance, including unknown outcomes.
      // Only explicit refusal may unlock this same mounted card here.
      () => {},
    );
  };
  const triggerTap = () => {
    if (!hasAcceptedSwipeRef.current && onTap) onTap(product);
  };
  const triggerDismissPersonalInsight = () => {
    if (!isTop || !personalInsight || !onDismissPersonalInsight) return;
    onDismissPersonalInsight();
  };

  const handleAccessibilityAction = ({ nativeEvent }) => {
    if (!isTop || interactionDisabled) return;
    if (nativeEvent.actionName === "activate") triggerTap();
    if (nativeEvent.actionName === "like") triggerAccessibleSwipe(onSwipeRight);
    if (nativeEvent.actionName === "pass") triggerAccessibleSwipe(onSwipeLeft);
    if (nativeEvent.actionName === "cart") triggerAccessibleSwipe(onSwipeUp);
    if (nativeEvent.actionName === "dismissInsight")
      triggerDismissPersonalInsight();
  };

  const hasDismissiblePersonalInsight = Boolean(
    isTop && personalInsight && onDismissPersonalInsight,
  );
  const dismissInsightTap = Gesture.Tap()
    .enabled(hasDismissiblePersonalInsight)
    .maxDuration(350)
    // The outer RNGH gesture must wait for this target, but iOS still needs
    // the nested React Native Pressable responder to receive its onPress.
    .cancelsTouchesInView(false);

  const pan = Gesture.Pan()
    .enabled(
      isTop &&
        !usesAccessibleCopyLayout &&
        !externalSwipe &&
        !interactionDisabled,
    )
    .onBegin(() => {
      // A canceled/failed pan never crosses the JS acceptance boundary. Keep
      // that distinction on the UI thread so finalization can restore the
      // cover without reversing a release that already entered persistence.
      gestureExitAccepted.value = false;
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * VISUAL_VERTICAL_DRAG_SCALE;
    })
    .onEnd((e, success) => {
      // RNGH also ends ACTIVE pans with success=false on cancellation/failure.
      // Only a completed release can commit; finalization owns their snap-back.
      if (!success) return;
      const isFlick = Math.abs(e.velocityX) > VELOCITY_THRESHOLD;
      const isPast = Math.abs(e.translationX) > SWIPE_THRESHOLD;

      // Upward swipe: more vertical than horizontal, exceeds threshold
      const isUpFlick = e.velocityY < -UP_VELOCITY_THRESHOLD;
      const isUpPast = e.translationY < -UP_THRESHOLD;
      const isMoreVertical =
        Math.abs(e.translationY) > Math.abs(e.translationX) * 1.2;
      const goUp = (isUpFlick || isUpPast) && isMoreVertical && onSwipeUp;

      if (goUp) {
        gestureAnimationSequence.value += 1;
        const animationToken = `gesture:${product.id}:${gestureAnimationSequence.value}`;
        gestureExitAccepted.value = true;
        runOnJS(acceptSwipeAnimation)("up", animationToken);
        const dur = exitDuration(e.velocityY);
        translateX.value = withTiming(translateX.value * 0.3, {
          duration: dur,
          reduceMotion: ReduceMotion.System,
        });
        translateY.value = withTiming(
          -SCREEN_H * 1.4,
          {
            duration: dur,
            easing: Easing.out(Easing.quad),
            reduceMotion: ReduceMotion.System,
          },
          (finished) => {
            if (finished)
              runOnJS(completeSwipeAnimation)(animationToken);
            else runOnJS(cancelSwipeAnimation)(animationToken, null);
          },
        );
        return;
      }

      if (isFlick || isPast) {
        gestureAnimationSequence.value += 1;
        const animationToken = `gesture:${product.id}:${gestureAnimationSequence.value}`;
        gestureExitAccepted.value = true;
        const goRight = isPast ? e.translationX > 0 : e.velocityX > 0;
        runOnJS(acceptSwipeAnimation)(
          goRight ? "right" : "left",
          animationToken,
        );
        const dur = exitDuration(e.velocityX);
        const targetX = goRight ? SCREEN_W * 1.55 : -SCREEN_W * 1.55;

        // Y floats slightly upward on exit — natural hand-release feel
        translateY.value = withTiming(translateY.value - 60, {
          duration: dur,
          reduceMotion: ReduceMotion.System,
        });

        // Only the visual-settlement callback waits for completion. The
        // accepted choice already entered persistence above, so the card can
        // stay mounted for the full exit arc without delaying the write.
        translateX.value = withTiming(
          targetX,
          {
            duration: dur,
            easing: Easing.out(Easing.quad),
            reduceMotion: ReduceMotion.System,
          },
          (finished) => {
            if (finished)
              runOnJS(completeSwipeAnimation)(animationToken);
            else runOnJS(cancelSwipeAnimation)(animationToken, null);
          },
        );
      } else {
        // Not far enough — spring back with satisfying bounce
        translateX.value = withSpring(0, SNAP_SPRING);
        translateY.value = withSpring(0, SNAP_SPRING);
      }
    })
    .onFinalize((_event, success) => {
      if (success || gestureExitAccepted.value) return;
      // Cancellation/failure can follow onEnd(false), or skip onEnd when the
      // pan never became active (for example, an older write restores a card).
      // Restore only presentation; do not emit persistence or settlement.
      translateX.value = withSpring(0, SNAP_SPRING);
      translateY.value = withSpring(0, SNAP_SPRING);
    });

  const tap = Gesture.Tap()
    .enabled(
      isTop &&
        !usesAccessibleCopyLayout &&
        !externalSwipe &&
        !interactionDisabled,
    )
    .maxDuration(350)
    .onEnd((_event, success) => {
      if (success && onTap) runOnJS(triggerTap)();
    });

  const cardGesture = Gesture.Race(pan, tap);
  if (hasDismissiblePersonalInsight) {
    cardGesture.requireExternalGestureToFail(dismissInsightTap);
  }

  // Button persistence is accepted by the parent before this effect renders.
  // This child owns only the visible exit and uses the approved fast token.
  useEffect(() => {
    if (!externalSwipe) return;
    const goRight = externalSwipe.direction === "right";
    const goUp = externalSwipe.direction === "up";
    const commandToken = externalSwipe.token;
    const animationToken = externalSwipe.animationToken;
    const targetX = goRight ? SCREEN_W * 1.55 : -SCREEN_W * 1.55;
    acceptedSwipeRequestRef.current = null;
    activeSwipeAnimationTokenRef.current = animationToken;
    hasAcceptedSwipeRef.current = true;

    if (goUp) {
      translateX.value = withTiming(0, {
        duration: TAP_SWIPE_EXIT_DURATION,
        reduceMotion: ReduceMotion.System,
      });
      translateY.value = withTiming(
        -SCREEN_H * 1.4,
        {
          duration: TAP_SWIPE_EXIT_DURATION,
          easing: Easing.out(Easing.quad),
          reduceMotion: ReduceMotion.System,
        },
        (finished) => {
          if (finished)
            runOnJS(completeSwipeAnimation)(animationToken);
          else
            runOnJS(cancelSwipeAnimation)(animationToken, commandToken);
        },
      );
      return () => {
        if (activeSwipeAnimationTokenRef.current === animationToken) {
          cancelSwipeAnimation(animationToken, commandToken);
        }
      };
    }

    translateY.value = withTiming(-70, {
      duration: TAP_SWIPE_EXIT_DURATION,
      reduceMotion: ReduceMotion.System,
    });
    translateX.value = withTiming(
      targetX,
      {
        duration: TAP_SWIPE_EXIT_DURATION,
        easing: Easing.out(Easing.quad),
        reduceMotion: ReduceMotion.System,
      },
      (finished) => {
        if (finished)
          runOnJS(completeSwipeAnimation)(animationToken);
        else runOnJS(cancelSwipeAnimation)(animationToken, commandToken);
      },
    );
    return () => {
      if (activeSwipeAnimationTokenRef.current === animationToken) {
        cancelSwipeAnimation(animationToken, commandToken);
      }
    };
    // The accepted command belongs to this product even if an older failed
    // write temporarily restores another card ahead of it. Only command loss
    // cancels the local animation; an isTop change must not revoke the choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSwipe]);

  const cardStyle = useAnimatedStyle(() => {
    const i = animatedIndex.value;

    // Stack depth: index 0 = full size at front, 1 = slightly behind, 2 = further
    const stackScale = 1 - i * 0.038;
    const stackY = i * 16;
    const stackOpacity = Math.max(0, 1 - i * 0.1);

    const rotate = isTop
      ? interpolate(
          translateX.value,
          [-SCREEN_W / 2, 0, SCREEN_W / 2],
          [-14, 0, 14],
          Extrapolation.CLAMP,
        )
      : 0;

    return {
      transform: [
        { translateX: isTop ? translateX.value : 0 },
        { translateY: (isTop ? translateY.value : 0) + stackY },
        { rotate: `${rotate}deg` },
        { scale: stackScale },
      ],
      opacity: stackOpacity,
    };
  });

  // Thin directional seams — the approved Editorial Pulse reaction language.
  const likeTintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const passTintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const cartBadgeStyle = useAnimatedStyle(() => {
    // translateY deliberately follows only a fifth of the finger's vertical
    // travel, so the visual seam must use the same coordinate space as the
    // card. A qualifying -110pt drag should reveal it before commitment.
    const visualUpThreshold = UP_THRESHOLD * VISUAL_VERTICAL_DRAG_SCALE;
    const p = interpolate(
      translateY.value,
      [-visualUpThreshold * 0.8, -visualUpThreshold * 0.2],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity: p,
      transform: [
        { scaleX: interpolate(p, [0, 1], [0.25, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  const primaryTag = (product.tags || [])[0];
  const categoryLine = [product.category, primaryTag]
    .filter(Boolean)
    .map((value) => String(value).replace(/-/g, " "))
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(" · ");
  const feedPosition = Number.isInteger(product._feedPosition)
    ? String(product._feedPosition + 1).padStart(3, "0")
    : null;
  const productCopy = (
    <>
      {isTop && personalInsight ? (
        <View
          style={{
            alignSelf: "flex-start",
            maxWidth: "92%",
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            marginBottom: spacing.lg,
            paddingLeft: spacing.md,
            paddingRight: hasDismissiblePersonalInsight
              ? 0
              : spacing.md,
            paddingVertical: hasDismissiblePersonalInsight ? 0 : spacing.sm,
            minHeight: hasDismissiblePersonalInsight ? 44 : undefined,
            borderRadius: radius.signal,
            backgroundColor: color.light.personal,
          }}
        >
          <Text
            style={{
              ...type.captionStrong,
              color: color.light.personalInk,
              ...(hasDismissiblePersonalInsight ? { flexShrink: 1 } : {}),
            }}
          >
            ✦ {personalInsight}
          </Text>
          {hasDismissiblePersonalInsight ? (
            <GestureDetector gesture={dismissInsightTap}>
              <Pressable
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                hitSlop={0}
                onPress={(event) => {
                  event.stopPropagation?.();
                  triggerDismissPersonalInsight();
                }}
                style={({ pressed }) => ({
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.56 : 1,
                })}
              >
                <Text
                  accessible={false}
                  style={{
                    ...type.bodyLargeStrong,
                    color: color.light.personalInk,
                    lineHeight: 22,
                  }}
                >
                  ×
                </Text>
              </Pressable>
            </GestureDetector>
          ) : null}
        </View>
      ) : null}

      <Text
        style={{
          ...type.micro,
          fontFamily: fontFamilies.commerce.semibold,
          color: color.onImage,
          letterSpacing: 1.4,
          marginBottom: spacing.sm,
          ...TEXT_SHADOW,
        }}
      >
        {(product.brand || "").toUpperCase()}
      </Text>
      <Text
        style={{
          ...type.product,
          color: color.onImage,
          letterSpacing: -0.96,
          marginBottom: spacing.md,
          ...TEXT_SHADOW,
        }}
      >
        {product.title || ""}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          gap: spacing.md,
          flexWrap: "wrap",
        }}
      >
        <Text
          style={{
            ...type.price,
            color: color.onImage,
            ...TEXT_SHADOW,
          }}
        >
          {formatProductPrice(product)}
        </Text>
        {categoryLine ? (
          <Text
            style={{
              ...type.caption,
              color: color.onImageMuted,
              textTransform: "capitalize",
              ...TEXT_SHADOW,
            }}
          >
            {categoryLine}
          </Text>
        ) : null}
      </View>
    </>
  );

  return (
    <GestureDetector gesture={cardGesture}>
      <Animated.View
        accessible={isTop}
        accessibilityRole={isTop ? "button" : undefined}
        accessibilityLabel={
          isTop
            ? [buildProductAccessibilityLabel(product), personalInsight]
                .filter(Boolean)
                .join(". ")
            : undefined
        }
        accessibilityHint={
          isTop
            ? interactionDisabled
              ? "Waiting for recent choices to finish."
              : "Double tap for details. Use Actions to pass, like, or add to Looks."
            : undefined
        }
        accessibilityState={
          isTop ? { disabled: interactionDisabled } : undefined
        }
        accessibilityActions={
          isTop && !interactionDisabled
            ? [
                { name: "activate", label: "View product details" },
                { name: "pass", label: "Pass product" },
                { name: "like", label: "Like product" },
                ...(onSwipeUp
                  ? [{ name: "cart", label: "Add product to Looks" }]
                  : []),
                ...(hasDismissiblePersonalInsight
                  ? [
                      {
                        name: "dismissInsight",
                        label: "Dismiss personal insight",
                      },
                    ]
                  : []),
              ]
            : undefined
        }
        onAccessibilityAction={
          isTop && !interactionDisabled ? handleAccessibilityAction : undefined
        }
        onAccessibilityTap={
          isTop && !interactionDisabled ? triggerTap : undefined
        }
        accessibilityElementsHidden={!isTop}
        importantForAccessibility={isTop ? "yes" : "no-hide-descendants"}
        style={[
          {
            position: "absolute",
            width: "100%",
            height: "100%",
            borderRadius: isTop ? 0 : radius.card,
            backgroundColor: "#161513",
            overflow: "hidden",
          },
          cardStyle,
        ]}
      >
        {/* Product image */}
        {!imageFailed &&
        typeof product.image === "string" &&
        product.image.length > 0 ? (
          <Image
            accessible={false}
            source={{ uri: product.image }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={150}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View
            pointerEvents="none"
            style={{
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: color.dark.paper,
              paddingHorizontal: spacing["3xl"],
            }}
          >
            <Text
              style={{
                ...type.micro,
                color: color.onImageMuted,
                letterSpacing: 1.4,
              }}
            >
              IMAGE UNAVAILABLE
            </Text>
            <Text
              style={{
                ...type.titleSmall,
                color: color.onImage,
                textAlign: "center",
                marginTop: spacing.md,
              }}
            >
              {product.brand || product.title || "Product"}
            </Text>
          </View>
        )}

        {/* Original Editorial Pulse shade: quiet top, rich readable bottom. */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            color.imageScrimTop,
            "rgba(0,0,0,0.32)",
            "transparent",
            color.imageScrimStrong,
          ]}
          locations={[0, 0.22, 0.46, 1]}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />

        {/* Directional seams replace copied swipe stamps and full-card tints. */}
        {isTop && (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                width: 6,
                backgroundColor: color.light.keepAction,
              },
              likeTintStyle,
            ]}
          />
        )}

        {isTop && (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: 6,
                backgroundColor: color.light.stone,
              },
              passTintStyle,
            ]}
          />
        )}

        {isTop && onSwipeUp && (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 6,
                backgroundColor: color.light.pulse,
              },
              cartBadgeStyle,
            ]}
          />
        )}

        {isTop && feedPosition && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: -38,
              top: 170,
              width: 138,
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              paddingHorizontal: spacing.sm,
              paddingVertical: 6,
              borderRadius: radius.signal,
              backgroundColor: "rgba(17,17,15,0.64)",
              transform: [{ rotate: "-90deg" }],
            }}
          >
            <View
              style={{
                width: 52,
                height: 3,
                backgroundColor: color.light.personal,
              }}
            />
            <Text
              style={{
                ...type.micro,
                color: "rgba(255,253,252,0.88)",
                letterSpacing: 1.4,
                textTransform: "uppercase",
              }}
            >
              FOR YOU / {feedPosition}
            </Text>
          </View>
        )}

        <View
          pointerEvents={
            usesAccessibleCopyLayout || hasDismissiblePersonalInsight
              ? "box-none"
              : "none"
          }
          style={{
            position: "absolute",
            left: spacing["2xl"],
            right: spacing["2xl"],
            ...(usesAccessibleCopyLayout
              ? { top: 0, bottom: 0 }
              : { bottom: copyBottomInset }),
          }}
        >
          {usesAccessibleCopyLayout ? (
            <ScrollView
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              nestedScrollEnabled
              indicatorStyle="white"
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "flex-end",
                paddingTop: copyTopInset + spacing.sm,
                paddingBottom: copyBottomInset,
              }}
            >
              <Pressable
                accessible={false}
                disabled={interactionDisabled}
                onPress={triggerTap}
              >
                {productCopy}
              </Pressable>
            </ScrollView>
          ) : (
            productCopy
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
