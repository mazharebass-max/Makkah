import type { ReactNode } from "react";

export function useRouter() {
  return {
    push: (_href: string) => undefined,
    replace: (_href: string) => undefined,
    back: () => undefined,
  };
}

function Screen(_props: { name?: string; options?: object; children?: ReactNode }) {
  return null;
}

export function Stack(_props: { children?: ReactNode; screenOptions?: object }) {
  return null;
}
Stack.Screen = Screen;

export function Tabs(_props: { children?: ReactNode; screenOptions?: object }) {
  return null;
}
Tabs.Screen = Screen;

export function Link(_props: { href: string; children?: ReactNode }) {
  return null;
}

export function useLocalSearchParams<T extends Record<string, string>>() {
  return {} as T;
}
