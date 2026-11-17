import type { CSSProperties, ReactNode } from "react";
import { colors, radii } from "./tokens.js";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const map: Record<string, CSSProperties> = {
    neutral: { background: "rgba(11,31,58,0.08)", color: colors.midnight },
    success: { background: "rgba(8,127,109,0.12)", color: colors.emerald },
    warning: { background: "rgba(198,161,91,0.2)", color: "#7a5d1d" },
    danger: { background: "rgba(180,35,24,0.12)", color: colors.danger },
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 28,
        padding: "2px 10px",
        borderRadius: radii.md,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.02em",
        ...map[tone],
      }}
    >
      {children}
    </span>
  );
}
