import React from 'react';
import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

/**
 * App-wide screen wrapper that respects the device safe area (camera notch/status bar).
 * Use this as the root wrapper for screens to avoid content overlapping system UI.
 */
export function Screen({ children, style }: ScreenProps) {
  return (
    <SafeAreaView style={[{ flex: 1 }, style]} edges={['top']}>
      {children}
    </SafeAreaView>
  );
}

