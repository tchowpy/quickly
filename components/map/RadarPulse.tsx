// components/map/RadarPulse.tsx
import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";

export function RadarPulse({ size = 160, color = "rgba(123, 63, 228, 0.35)" }) {
  const scale1 = useRef(new Animated.Value(0)).current;
  const opacity1 = useRef(new Animated.Value(1)).current;

  const scale2 = useRef(new Animated.Value(0)).current;
  const opacity2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animatePulse = (scale: Animated.Value, opacity: Animated.Value, delay = 0) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 1.8,
              duration: 2500,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 2500,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(scale, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    };

    animatePulse(scale1, opacity1, 0);
    animatePulse(scale2, opacity2, 900);
  }, []);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.pulse,
          {
            backgroundColor: color,
            transform: [{ scale: scale1 }],
            opacity: opacity1,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.pulse,
          {
            backgroundColor: color,
            transform: [{ scale: scale2 }],
            opacity: opacity2,
          },
        ]}
      />
      {/* Centre fixe */}
      <View style={styles.centerDot} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  pulse: {
    position: "absolute",
    borderRadius: 9999,
    width: "100%",
    height: "100%",
  },
  centerDot: {
    width: 18,
    height: 18,
    backgroundColor: "#7B3FE4",
    borderRadius: 9999,
    borderWidth: 3,
    borderColor: "white",
  },
});
