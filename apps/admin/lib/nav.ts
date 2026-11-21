export type AdminNavKey =
  | "overview"
  | "compliance"
  | "finance"
  | "support"
  | "notifications"
  | "analytics"
  | "settings"
  | "ops";

export function adminNav(active: AdminNavKey) {
  const items: { href: string; label: string; key: AdminNavKey }[] = [
    { href: "/", label: "Overview", key: "overview" },
    { href: "/compliance", label: "Compliance", key: "compliance" },
    { href: "/finance", label: "Finance", key: "finance" },
    { href: "/support", label: "Support", key: "support" },
    { href: "/notifications", label: "Notifications", key: "notifications" },
    { href: "/analytics", label: "Analytics", key: "analytics" },
    { href: "/settings", label: "Settings", key: "settings" },
    { href: "/ops", label: "Ops / Gate", key: "ops" },
  ];
  return items.map((item) => ({
    href: item.href,
    label: item.label,
    active: item.key === active,
  }));
}
