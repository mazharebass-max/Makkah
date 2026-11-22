import type { CSSProperties, ReactNode } from "react";
import { colors, radii } from "./tokens.js";

export function BrandMark({ size = "lg" }: { size?: "sm" | "lg" }) {
  const fontSize = size === "lg" ? 34 : 20;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontSize,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: colors.midnight,
          lineHeight: 1.05,
        }}
      >
        Haramain Ride
      </span>
      <span style={{ color: colors.slate, fontSize: size === "lg" ? 14 : 12 }}>
        Premium pilgrim ground transport
      </span>
    </div>
  );
}

export function PublicShell({
  children,
  locale = "en",
  nav,
  brand,
  footer,
}: {
  children: ReactNode;
  locale?: string;
  nav?: ReactNode;
  /** Optional brand slot (e.g. home link). Defaults to BrandMark. */
  brand?: ReactNode;
  footer?: ReactNode;
}) {
  const dir = locale === "ar" || locale === "ur" ? "rtl" : "ltr";
  return (
    <div dir={dir} style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <a className="hr-skip" href="#main">
        Skip to content
      </a>
      <header
        role="banner"
        className="hr-public-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          minHeight: 72,
          padding: "12px clamp(16px, 4vw, 48px)",
          borderBottom: "1px solid rgba(11,31,58,0.07)",
          boxShadow: "0 10px 30px rgba(11,31,58,0.05)",
          backdropFilter: "blur(16px)",
          background: "rgba(255,255,255,0.92)",
          position: "sticky",
          top: 0,
          zIndex: 40,
          overflow: "visible",
        }}
      >
        <div className="hr-public-brand" style={{ minWidth: 0, flex: "1 1 auto", maxWidth: "min(100%, 280px)" }}>
          {brand ?? <BrandMark size="sm" />}
        </div>
        <nav
          aria-label="Primary"
          className="hr-public-nav"
          style={{ flex: "0 1 auto", display: "flex", justifyContent: "flex-end", alignItems: "center", minWidth: 0 }}
        >
          {nav}
        </nav>
      </header>
      <main id="main" style={{ padding: "28px clamp(16px, 4vw, 48px) 36px", flex: 1 }}>
        {children}
      </main>
      {footer ? (
        <div style={{ padding: "0 clamp(16px, 4vw, 48px) 20px" }}>{footer}</div>
      ) : null}
    </div>
  );
}

export function AdminShell({
  children,
  userLabel,
  navItems,
}: {
  children: ReactNode;
  userLabel: string;
  navItems: { href: string; label: string; active?: boolean }[];
}) {
  const aside: CSSProperties = {
    width: 240,
    background: colors.midnight,
    color: colors.white,
    minHeight: "100vh",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 24,
  };
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f3f1ec" }}>
      <aside style={aside}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Haramain</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>Operations console</div>
        </div>
        <nav aria-label="Admin" style={{ display: "grid", gap: 8 }}>
          {navItems.map((item) => (
            <a
              key={`${item.href}-${item.label}`}
              href={item.href}
              style={{
                color: colors.white,
                textDecoration: "none",
                padding: "12px 14px",
                borderRadius: radii.md,
                background: item.active ? "rgba(198,161,91,0.22)" : "transparent",
                minHeight: 44,
                display: "flex",
                alignItems: "center",
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            background: colors.white,
            borderBottom: "1px solid rgba(11,31,58,0.08)",
          }}
        >
          <strong>Dispatch &amp; compliance</strong>
          <span style={{ color: colors.slate, fontSize: 14 }}>{userLabel}</span>
        </header>
        <main style={{ padding: 24 }}>{children}</main>
      </div>
    </div>
  );
}
