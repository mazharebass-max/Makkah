import type { CSSProperties, ReactNode } from "react";

export type ViewStyle = CSSProperties;
export type TextStyle = CSSProperties;

export const View = (props: { style?: ViewStyle; children?: ReactNode; testID?: string }) =>
  null as unknown as ReactNode;
export const Text = (props: { style?: TextStyle; children?: ReactNode }) =>
  null as unknown as ReactNode;
export const Pressable = (props: {
  onPress?: () => void;
  style?: ViewStyle;
  children?: ReactNode;
}) => null as unknown as ReactNode;
export const TextInput = (props: {
  value?: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  style?: TextStyle;
}) => null as unknown as ReactNode;
export const ScrollView = (props: {
  children?: ReactNode;
  style?: ViewStyle;
  testID?: string;
}) => null as unknown as ReactNode;
export const ActivityIndicator = (_props: { color?: string }) => null as unknown as ReactNode;
export const StyleSheet = {
  create<T extends Record<string, ViewStyle | TextStyle>>(styles: T): T {
    return styles;
  },
};
export const Platform = { OS: "ios" as const };
