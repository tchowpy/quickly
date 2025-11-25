import React from "react";
import { View, StyleSheet } from "react-native";
import { RadarPulse } from "./RadarPulse";

export function RadarPulseWrapper({ size = 200, color }) {
  return (
    <View
      style={[
        styles.wrapper,
        {
          width: size,
          height: size,
          marginLeft: -(size / 2),
          marginTop: -(size / 2),
        },
      ]}
      pointerEvents="none"
    >
      <RadarPulse size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
  },
});
