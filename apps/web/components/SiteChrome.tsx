"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import { PublicShell } from "@haramain/ui";
import { BrandLockup } from "./BrandLogo";
import { dirFor, otherLocale, t, type Locale } from "../lib/i18n";
import { whatsappDisplay, whatsappE164, whatsappHref } from "../lib/whatsapp";

const linkStyle: CSSProperties = {
  color: "#526276",
  textDecoration: "none",
  fontSize: 14,
  lineHeight: 1.6,
};

const colTitle: CSSProperties = {
  margin: "0 0 10px",
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#0B1F3A",
};

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12.04 2c-5.46 0-9.91 4.43-9.91 9.9 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2zm5.85 14.12c-.24.68-1.4 1.25-1.94 1.33-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.82-4.2-4.97-4.39-.14-.19-1.2-1.6-1.2-3.05 0-1.45.76-2.16 1.03-2.45.27-.29.59-.36.79-.36h.57c.18 0 .42-.07.66.5.24.58.82 2 .89 2.14.07.14.12.31.02.5-.1.19-.14.31-.28.48-.14.17-.3.37-.42.5-.14.14-.28.29-.12.56.16.28.71 1.17 1.53 1.89 1.05.93 1.94 1.22 2.21 1.36.28.14.44.12.6-.07.16-.19.7-.81.89-1.09.19-.28.37-.23.63-.14.26.09 1.65.78 1.93.92.28.14.47.21.54.33.07.12.07.7-.17 1.38z"
      />
    </svg>
  );
}

function SiteChromeInner({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const searchKey = search.toString();
  const wa = whatsappE164();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, searchKey]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  function switchLocale() {
    const next = otherLocale(locale);
    const params = new URLSearchParams(search.toString());
    params.set("lang", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  const footerLink = (href: string, label: string) => (
    <Link
      href={href}
      style={linkStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#1A5FBF";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "#526276";
      }}
    >
      {label}
    </Link>
  );

  // Journey order: corridors → vehicles → how → who → contact
  const primaryLinks = [
    { href: `/routes?lang=${locale}`, path: "/routes", label: t(locale, "routesNav") },
    { href: `/fleet?lang=${locale}`, path: "/fleet", label: t(locale, "fleetNav") },
    { href: `/how-it-works?lang=${locale}`, path: "/how-it-works", label: t(locale, "howItWorks") },
    { href: `/about?lang=${locale}`, path: "/about", label: t(locale, "aboutNav") },
    { href: `/contact?lang=${locale}`, path: "/contact", label: t(locale, "contactNav") },
  ];

  const bookHref = `/?lang=${locale}#book`;
  const accountHref = `/login?lang=${locale}`;
  const tripsHref = `/trips?lang=${locale}`;
  const supportHref = `/support?lang=${locale}`;
  const waHref = wa ? whatsappHref(wa, t(locale, "whatsappPrefill")) : null;
  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  const quietLink: CSSProperties = {
    color: "#0B1F3A",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
    padding: "8px 11px",
    borderRadius: 10,
    whiteSpace: "nowrap",
  };

  const ctaBook: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "0 16px",
    borderRadius: 11,
    background: "#F0771F",
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    textDecoration: "none",
    whiteSpace: "nowrap",
    boxShadow: "0 8px 18px rgba(240,119,31,0.28)",
  };

  const iconBtn: CSSProperties = {
    width: 42,
    height: 42,
    borderRadius: 11,
    border: "1px solid rgba(37,211,102,0.4)",
    background: "#F3FFF7",
    color: "#128C7E",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    flexShrink: 0,
  };

  const ghostBtn: CSSProperties = {
    minHeight: 42,
    padding: "0 12px",
    borderRadius: 11,
    border: "1px solid rgba(11,31,58,0.12)",
    background: "#fff",
    color: "#0B1F3A",
    fontWeight: 600,
    fontSize: 13,
    fontFamily: "inherit",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
  };

  return (
    <div dir={dirFor(locale)} lang={locale}>
      <PublicShell
        locale={locale}
        brand={
          <Link
            href={`/?lang=${locale}`}
            className="hr-brand-link"
            style={{ textDecoration: "none", color: "inherit", display: "inline-flex", minWidth: 0 }}
            aria-label={t(locale, "brand")}
          >
            <BrandLockup brand={t(locale, "brand")} tagline={t(locale, "tagline")} markSize={44} />
          </Link>
        }
        nav={
          <div className="hr-header-nav" style={{ position: "relative" }}>
            {/* Desktop */}
            <div
              className="hr-nav-desktop"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <nav
                aria-label={t(locale, "navBrowse")}
                style={{ display: "flex", alignItems: "center", gap: 2, marginInlineEnd: 6 }}
              >
                {primaryLinks.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      style={{
                        ...quietLink,
                        background: active ? "rgba(26,95,191,0.1)" : "transparent",
                        color: active ? "#1A5FBF" : "#0B1F3A",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(26,95,191,0.08)";
                        e.currentTarget.style.color = "#1A5FBF";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = active ? "rgba(26,95,191,0.1)" : "transparent";
                        e.currentTarget.style.color = active ? "#1A5FBF" : "#0B1F3A";
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <span
                aria-hidden="true"
                style={{
                  width: 1,
                  height: 28,
                  background: "rgba(11,31,58,0.12)",
                  marginInline: 6,
                  flexShrink: 0,
                }}
              />

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {waHref ? (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${t(locale, "whatsappCta")} ${whatsappDisplay(wa!)}`}
                    style={iconBtn}
                    title={t(locale, "whatsappCta")}
                  >
                    <WhatsAppIcon size={18} />
                  </a>
                ) : null}
                <Link href={accountHref} style={ghostBtn}>
                  {t(locale, "accountNav")}
                </Link>
                <button type="button" onClick={switchLocale} style={ghostBtn} aria-label={t(locale, "language")}>
                  {t(locale, "language")}
                </button>
                <Link href={bookHref} style={ctaBook}>
                  {t(locale, "searchCta")}
                </Link>
              </div>
            </div>

            {/* Mobile: menu only — no overflow */}
            <div className="hr-nav-mobile-bar" style={{ display: "none" }}>
              <button
                type="button"
                className="hr-nav-toggle"
                aria-expanded={menuOpen}
                aria-controls={menuId}
                aria-label={menuOpen ? t(locale, "menuClose") : t(locale, "menuOpen")}
                onClick={() => setMenuOpen((v) => !v)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  border: "1px solid rgba(11,31,58,0.12)",
                  background: menuOpen ? "#0B1F3A" : "#fff",
                  color: menuOpen ? "#fff" : "#0B1F3A",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <span aria-hidden="true" style={{ display: "inline-flex" }}>
                  {menuOpen ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                  )}
                </span>
              </button>
            </div>

            {menuOpen ? (
              <div
                id={menuId}
                className="hr-nav-drawer"
                role="dialog"
                aria-modal="true"
                aria-label={t(locale, "menuOpen")}
                style={{
                  position: "fixed",
                  inset: 0,
                  top: 72,
                  background: "rgba(11,31,58,0.4)",
                  zIndex: 60,
                }}
                onClick={() => setMenuOpen(false)}
              >
                <div
                  style={{
                    background: "#fff",
                    borderBottomLeftRadius: 20,
                    borderBottomRightRadius: 20,
                    boxShadow: "0 18px 40px rgba(11,31,58,0.18)",
                    padding: "8px 16px 20px",
                    display: "grid",
                    gap: 2,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p
                    style={{
                      margin: "8px 8px 4px",
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: "#526276",
                    }}
                  >
                    {t(locale, "navBrowse")}
                  </p>
                  {primaryLinks.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        aria-current={active ? "page" : undefined}
                        style={{
                          ...quietLink,
                          display: "block",
                          padding: "14px 8px",
                          fontSize: 16,
                          borderBottom: "1px solid rgba(11,31,58,0.06)",
                          borderRadius: 0,
                          color: active ? "#1A5FBF" : "#0B1F3A",
                          background: active ? "rgba(26,95,191,0.06)" : "transparent",
                        }}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                  <p
                    style={{
                      margin: "16px 8px 4px",
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: "#526276",
                    }}
                  >
                    {t(locale, "navAccount")}
                  </p>
                  <Link
                    href={tripsHref}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      ...quietLink,
                      display: "block",
                      padding: "14px 8px",
                      fontSize: 16,
                      borderBottom: "1px solid rgba(11,31,58,0.06)",
                      borderRadius: 0,
                    }}
                  >
                    {t(locale, "myTrips")}
                  </Link>
                  <Link
                    href={supportHref}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      ...quietLink,
                      display: "block",
                      padding: "14px 8px",
                      fontSize: 16,
                      borderBottom: "1px solid rgba(11,31,58,0.06)",
                      borderRadius: 0,
                    }}
                  >
                    {t(locale, "supportNav")}
                  </Link>
                  <Link
                    href={accountHref}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      ...quietLink,
                      display: "block",
                      padding: "14px 8px",
                      fontSize: 16,
                      borderBottom: "1px solid rgba(11,31,58,0.06)",
                      borderRadius: 0,
                    }}
                  >
                    {t(locale, "accountNav")}
                  </Link>
                  <Link
                    href={`/faq?lang=${locale}`}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      ...quietLink,
                      display: "block",
                      padding: "14px 8px",
                      fontSize: 16,
                      borderBottom: "1px solid rgba(11,31,58,0.06)",
                      borderRadius: 0,
                    }}
                  >
                    {t(locale, "faqNav")}
                  </Link>

                  <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                    <Link href={bookHref} onClick={() => setMenuOpen(false)} style={{ ...ctaBook, minHeight: 48 }}>
                      {t(locale, "searchCta")}
                    </Link>
                    {waHref ? (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMenuOpen(false)}
                        style={{
                          ...ghostBtn,
                          minHeight: 48,
                          gap: 8,
                          borderColor: "rgba(37,211,102,0.45)",
                          background: "#F3FFF7",
                          color: "#075E54",
                        }}
                      >
                        <WhatsAppIcon />
                        {t(locale, "whatsappCta")} · {whatsappDisplay(wa!)}
                      </a>
                    ) : null}
                    <button type="button" onClick={switchLocale} style={{ ...ghostBtn, minHeight: 48 }}>
                      {t(locale, "language")}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <style>{`
              @media (max-width: 1040px) {
                .hr-nav-desktop { display: none !important; }
                .hr-nav-mobile-bar { display: flex !important; align-items: center; justify-content: flex-end; }
                .hr-public-header .hr-brand-tagline { display: none !important; }
              }
              @media (min-width: 1041px) {
                .hr-nav-mobile-bar { display: none !important; }
                .hr-nav-drawer { display: none !important; }
              }
              @media (max-width: 800px) {
                .hr-footer-grid { grid-template-columns: 1fr 1fr !important; }
              }
              @media (max-width: 520px) {
                .hr-footer-grid { grid-template-columns: 1fr !important; }
              }
            `}</style>
          </div>
        }
        footer={
          <footer
            style={{
              marginTop: 56,
              paddingTop: 36,
              borderTop: "1px solid rgba(11,31,58,0.1)",
              display: "grid",
              gap: 28,
            }}
          >
            <div
              className="hr-footer-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(200px, 1.4fr) repeat(3, minmax(140px, 1fr))",
                gap: 28,
                alignItems: "start",
              }}
            >
              <div style={{ display: "grid", gap: 12 }}>
                <Link
                  href={`/?lang=${locale}`}
                  style={{ textDecoration: "none", color: "inherit", display: "inline-flex", width: "fit-content" }}
                  aria-label={t(locale, "brand")}
                >
                  <BrandLockup brand={t(locale, "brand")} tagline={t(locale, "tagline")} markSize={44} />
                </Link>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#9A4A0A",
                    background: "rgba(240,119,31,0.12)",
                    padding: "6px 10px",
                    borderRadius: 8,
                    width: "fit-content",
                  }}
                >
                  {t(locale, "pilot")}
                </p>
                {wa ? (
                  <a
                    href={whatsappHref(wa, t(locale, "whatsappPrefill"))}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 4,
                      minHeight: 40,
                      padding: "8px 14px",
                      borderRadius: 10,
                      background: "#25D366",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 14,
                      textDecoration: "none",
                      width: "fit-content",
                    }}
                  >
                    {t(locale, "whatsappCta")} · {whatsappDisplay(wa)}
                  </a>
                ) : (
                  <Link href={`/contact?lang=${locale}`} style={{ ...linkStyle, color: "#1A5FBF", fontWeight: 600 }}>
                    {t(locale, "contactNav")}
                  </Link>
                )}
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <p style={colTitle}>{t(locale, "footerRide")}</p>
                {footerLink(`/?lang=${locale}#book`, t(locale, "searchCta"))}
                {footerLink(`/routes?lang=${locale}`, t(locale, "routesNav"))}
                {footerLink(`/fleet?lang=${locale}`, t(locale, "fleetNav"))}
                {footerLink(`/how-it-works?lang=${locale}`, t(locale, "howItWorks"))}
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <p style={colTitle}>{t(locale, "footerHelp")}</p>
                {footerLink(`/contact?lang=${locale}`, t(locale, "contactNav"))}
                {footerLink(`/support?lang=${locale}`, t(locale, "supportNav"))}
                {footerLink(`/trips?lang=${locale}`, t(locale, "myTrips"))}
                {footerLink(`/faq?lang=${locale}`, t(locale, "faqNav"))}
                {footerLink(`/about?lang=${locale}`, t(locale, "aboutNav"))}
                {footerLink(`/login?lang=${locale}`, t(locale, "accountNav"))}
                {footerLink(`/providers/apply?lang=${locale}`, t(locale, "providerApply"))}
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <p style={colTitle}>{t(locale, "footerPolicies")}</p>
                {footerLink(`/legal/terms?lang=${locale}`, t(locale, "terms"))}
                {footerLink(`/legal/privacy?lang=${locale}`, t(locale, "privacy"))}
                {footerLink(`/legal/cancellation?lang=${locale}`, t(locale, "cancelPolicy"))}
              </div>
            </div>

            <div
              style={{
                paddingTop: 18,
                borderTop: "1px solid rgba(11,31,58,0.08)",
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                justifyContent: "space-between",
                alignItems: "center",
                color: "#526276",
                fontSize: 12,
              }}
            >
              <p style={{ margin: 0 }}>{t(locale, "footerRights")}</p>
              <p style={{ margin: 0, maxWidth: 420, lineHeight: 1.45 }}>{t(locale, "footerAttrPlaces")}</p>
            </div>
          </footer>
        }
      >
        {children}
      </PublicShell>
    </div>
  );
}

function SiteChromeFallback({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <div dir={dirFor(locale)} lang={locale}>
      <PublicShell locale={locale}>{children}</PublicShell>
    </div>
  );
}

export function SiteChrome({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <Suspense fallback={<SiteChromeFallback locale={locale}>{children}</SiteChromeFallback>}>
      <SiteChromeInner locale={locale}>{children}</SiteChromeInner>
    </Suspense>
  );
}
