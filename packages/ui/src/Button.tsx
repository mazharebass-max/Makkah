import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { colors, radii } from "./tokens.js";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const styles: Record<Variant, CSSProperties> = {
  primary: {
    background: colors.royal,
    color: colors.white,
    border: `1px solid ${colors.royal}`,
  },
  secondary: {
    background: colors.white,
    color: colors.midnight,
    border: `1px solid rgba(11, 31, 58, 0.16)`,
  },
  ghost: {
    background: "transparent",
    color: colors.midnight,
    border: "1px solid transparent",
  },
  danger: {
    background: colors.danger,
    color: colors.white,
    border: `1px solid ${colors.danger}`,
  },
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  children,
  style,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      style={{
        minHeight: 44,
        minWidth: 44,
        padding: "10px 18px",
        borderRadius: radii.lg,
        fontFamily: "inherit",
        fontWeight: 600,
        fontSize: 15,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "transform 160ms ease, box-shadow 160ms ease",
        boxShadow: variant === "primary" ? "0 8px 24px rgba(23, 74, 139, 0.22)" : undefined,
        ...styles[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
