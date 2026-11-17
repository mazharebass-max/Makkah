import type { InputHTMLAttributes } from "react";
import { colors, radii } from "./tokens.js";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({ label, error, id, style, ...rest }: InputProps) {
  const inputId = id ?? rest.name ?? label.replace(/\s+/g, "-").toLowerCase();
  return (
    <label
      htmlFor={inputId}
      style={{ display: "grid", gap: 8, fontSize: 14, color: colors.slate }}
    >
      <span style={{ fontWeight: 600, color: colors.midnight }}>{label}</span>
      <input
        id={inputId}
        style={{
          minHeight: 44,
          borderRadius: radii.md,
          border: `1px solid ${error ? colors.danger : "rgba(11,31,58,0.18)"}`,
          padding: "10px 14px",
          fontFamily: "inherit",
          fontSize: 16,
          background: colors.white,
          color: colors.midnight,
          ...style,
        }}
        {...rest}
      />
      {error ? (
        <span role="alert" style={{ color: colors.danger, fontSize: 13 }}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
