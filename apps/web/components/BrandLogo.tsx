import type { CSSProperties } from "react";

/** Twin-arch + corridor mark (SVG) for crisp inline use. */
export function BrandMark({
  size = 40,
  title = "Haramain Ride",
  style,
}: {
  size?: number;
  title?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      style={{ display: "block", flexShrink: 0, ...style }}
    >
      <title>{title}</title>
      <path
        stroke="#0B1F3A"
        strokeWidth="6.5"
        strokeLinecap="butt"
        strokeLinejoin="round"
        d="M13 43.5V23.5C13 14.8 18.2 9.5 24.5 9.5S32 13.2 32 21.5V43.5"
      />
      <path
        stroke="#0B1F3A"
        strokeWidth="6.5"
        strokeLinecap="butt"
        strokeLinejoin="round"
        d="M32 43.5V21.5C32 13.2 35.8 9.5 39.5 9.5S51 14.8 51 23.5V43.5"
      />
      <path
        stroke="#1A5FBF"
        strokeWidth="4"
        strokeLinecap="round"
        d="M12.5 50c7.8 5.6 15.4 5.6 19.5 5.6s11.7 0 19.5-5.6"
      />
      <circle cx="32" cy="56" r="3.2" fill="#F0771F" />
    </svg>
  );
}

/** Preferred header/footer tile — uses the finished raster mark. */
export function BrandMarkTile({
  size = 44,
  title = "Haramain Ride",
}: {
  size?: number;
  title?: string;
}) {
  const inner = Math.round(size * 0.82);
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.26),
        background: "#fff",
        border: "1px solid rgba(11,31,58,0.08)",
        boxShadow: "0 4px 14px rgba(11,31,58,0.07)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/haramain-ride-mark.png"
        alt={title}
        width={inner}
        height={inner}
        style={{ display: "block", objectFit: "contain" }}
      />
    </span>
  );
}

/** Shared header/footer lockup — same mark + wordmark everywhere. */
export function BrandLockup({
  brand,
  tagline,
  showTagline = true,
  markSize = 44,
}: {
  brand: string;
  tagline?: string;
  showTagline?: boolean;
  markSize?: number;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        minWidth: 0,
        color: "inherit",
      }}
    >
      <BrandMarkTile size={markSize} title={brand} />
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span
          style={{
            fontSize: markSize >= 44 ? 19 : 18,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#0B1F3A",
            lineHeight: 1.05,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {brand}
        </span>
        {showTagline && tagline ? (
          <span
            className="hr-brand-tagline"
            style={{ color: "#526276", fontSize: 12, lineHeight: 1.2, whiteSpace: "nowrap" }}
          >
            {tagline}
          </span>
        ) : null}
      </span>
    </span>
  );
}
