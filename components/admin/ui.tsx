import type { CSSProperties, ReactNode } from "react";
import { Icon } from "@/components/admin/icons";

// Re-export client primitives so consumers can import everything from ui.tsx.
// The "use client" boundary lives in ui-inputs.tsx — keeping ui.tsx server-friendly
// is required so server components (e.g. the dashboard) can read CHANNEL_CONFIG
// and other plain-data exports without going through a client module.
export {
  AdminInput,
  AdminTextarea,
  AdminSelect,
  Toggle,
  Tabs,
} from "@/components/admin/ui-inputs";

export function Card({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        background: "var(--admin-surface)",
        border: "1px solid var(--admin-border)",
        borderRadius: "var(--admin-radius)",
        boxShadow: "var(--admin-shadow-sm)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2 mb-4">
      <div className="flex-1">
        <div
          className="text-[15px] font-bold tracking-tight"
          style={{ color: "var(--admin-text)" }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            className="text-[12.5px] mt-0.5"
            style={{ color: "var(--admin-text-muted)" }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  confirmed: { label: "Confirmée", bg: "#DCFCE7", color: "#15803D" },
  pending:   { label: "En attente", bg: "#FEF9C3", color: "#A16207" },
  completed: { label: "Terminée",  bg: "#F1F5F9", color: "#475569" },
  cancelled: { label: "Annulée",   bg: "#FEE2E2", color: "#DC2626" },
};

export function StatusBadge({
  status,
  label,
}: {
  status: keyof typeof STATUS_CONFIG | string;
  label?: string;
}) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className="text-[12px] font-semibold rounded-full px-2.5 py-[3px] inline-block whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {label ?? cfg.label}
    </span>
  );
}

export const CHANNEL_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  direct:  { label: "Site direct",  color: "var(--admin-primary)", bg: "var(--admin-primary-light)" },
  manual:  { label: "Manuel",       color: "#475569",              bg: "#F1F5F9" },
  booking: { label: "Booking.com",  color: "#003580",              bg: "#E8F0FA" },
  airbnb:  { label: "Airbnb",       color: "#FF5A5F",              bg: "#FFE8E9" },
  ical:    { label: "iCal",         color: "#475569",              bg: "#F1F5F9" },
};

export function ChannelTag({ channel }: { channel: string }) {
  const cfg = CHANNEL_CONFIG[channel] ?? CHANNEL_CONFIG.manual;
  return (
    <span
      className="text-[12px] font-semibold rounded-md px-2 py-[2px]"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

export function PrimaryButton({
  children,
  href,
  onClick,
  type,
  icon = "Plus",
  disabled,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  icon?: keyof typeof Icon | null;
  disabled?: boolean;
}) {
  const IC = icon ? Icon[icon] : null;
  const cls =
    "inline-flex items-center gap-1.5 text-[13.5px] font-semibold transition-opacity disabled:opacity-50";
  const style: CSSProperties = {
    background: "var(--admin-primary)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 18px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
    cursor: disabled ? "not-allowed" : "pointer",
  };
  const inner = (
    <>
      {IC && <IC size={16} />}
      <span>{children}</span>
    </>
  );
  if (href) {
    return (
      <a href={href} className={cls} style={style}>
        {inner}
      </a>
    );
  }
  return (
    <button onClick={onClick} type={type} disabled={disabled} className={cls} style={style}>
      {inner}
    </button>
  );
}

export function GhostButton({
  children,
  href,
  onClick,
  active = false,
  icon,
  ariaLabel,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  icon?: keyof typeof Icon;
  ariaLabel?: string;
}) {
  const IC = icon ? Icon[icon] : null;
  const style: CSSProperties = {
    background: active ? "var(--admin-primary)" : "var(--admin-surface)",
    color: active ? "#fff" : "var(--admin-text-muted)",
    border: `1px solid ${active ? "var(--admin-primary)" : "var(--admin-border)"}`,
    borderRadius: 8,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 600,
    transition: "all 0.15s",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
  };
  if (href) {
    return (
      <a href={href} style={style} aria-label={ariaLabel}>
        {IC && <IC size={14} />}
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} style={style} aria-label={ariaLabel}>
      {IC && <IC size={14} />}
      {children}
    </button>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-7 flex-wrap">
      <div>
        <h1
          className="text-[24px] font-extrabold leading-tight"
          style={{ color: "var(--admin-text)", letterSpacing: "-0.6px" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-[14px] mt-1"
            style={{ color: "var(--admin-text-muted)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function KPICard({
  title,
  value,
  sub,
  trend,
  trendVal,
  accent = false,
}: {
  title: string;
  value: ReactNode;
  sub?: ReactNode;
  trend?: number;
  trendVal?: string;
  accent?: boolean;
}) {
  return (
    <Card style={{ padding: "18px 20px", flex: 1, minWidth: 140 }}>
      <div
        className="text-[12px] font-semibold uppercase tracking-[0.06em] mb-2.5"
        style={{ color: "var(--admin-text-muted)" }}
      >
        {title}
      </div>
      <div
        className="text-[28px] font-extrabold leading-none"
        style={{
          color: accent ? "var(--admin-primary)" : "var(--admin-text)",
          letterSpacing: "-1px",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="text-[12px] mt-1.5"
          style={{ color: "var(--admin-text-muted)" }}
        >
          {sub}
        </div>
      )}
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {trend >= 0 ? (
            <Icon.TrendUp size={14} style={{ color: "#16A34A" }} />
          ) : (
            <Icon.TrendDown size={14} style={{ color: "#DC2626" }} />
          )}
          <span
            className="text-[12px] font-semibold"
            style={{ color: trend >= 0 ? "#16A34A" : "#DC2626" }}
          >
            {trend >= 0 ? "+" : ""}
            {trendVal} vs sem. préc.
          </span>
        </div>
      )}
    </Card>
  );
}

/* ── Settings primitives (shared between Paramètres + Règles) ───────── */

export function SettingsSection({
  title,
  desc,
  action,
  children,
}: {
  title: string;
  desc?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="overflow-hidden mb-5"
      style={{
        background: "var(--admin-surface)",
        border: "1px solid var(--admin-border)",
        borderRadius: "var(--admin-radius)",
      }}
    >
      <header
        className="flex items-start justify-between gap-4 px-[22px] py-[18px]"
        style={{ borderBottom: "1px solid var(--admin-border)" }}
      >
        <div>
          <h2
            className="text-[15px] font-extrabold"
            style={{ color: "var(--admin-text)", letterSpacing: "-0.3px" }}
          >
            {title}
          </h2>
          {desc && (
            <p
              className="text-[12.5px] mt-1 leading-[1.5]"
              style={{ color: "var(--admin-text-muted)" }}
            >
              {desc}
            </p>
          )}
        </div>
        {action}
      </header>
      <div className="px-[22px] py-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="mb-3.5">
      <div
        className="text-[11.5px] font-bold uppercase mb-1.5"
        style={{
          color: "var(--admin-text-muted)",
          letterSpacing: "0.06em",
        }}
      >
        {label}
        {error && (
          <span
            className="font-medium ml-1 normal-case tracking-normal"
            style={{ color: "#DC2626" }}
          >
            · {error}
          </span>
        )}
      </div>
      {children}
      {hint && (
        <div
          className="text-[11.5px] mt-1.5 leading-[1.5]"
          style={{ color: "var(--admin-text-subtle)" }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

export function StatusBanner({
  variant,
  children,
}: {
  variant: "success" | "error" | "warning" | "info";
  children: ReactNode;
}) {
  const cfg = {
    success: { bg: "#DCFCE7", border: "#86EFAC", color: "#15803D" },
    error: { bg: "#FEE2E2", border: "#FCA5A5", color: "#991B1B" },
    warning: { bg: "#FEF3C7", border: "#FCD34D", color: "#92400E" },
    info: { bg: "var(--admin-primary-light)", border: "var(--admin-primary)", color: "var(--admin-primary)" },
  }[variant];
  return (
    <div
      className="px-3 py-2 mb-3 text-[12.5px] font-semibold rounded-lg"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
      }}
    >
      {children}
    </div>
  );
}

export function GuestAvatar({
  name,
  size = 36,
  bg = "var(--admin-primary-light)",
  color = "var(--admin-primary)",
}: {
  name: string;
  size?: number;
  bg?: string;
  color?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
  return (
    <div
      className="rounded-[10px] flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: bg,
      }}
    >
      <span
        className="font-bold"
        style={{
          color,
          fontSize: Math.round(size * 0.36),
        }}
      >
        {initials}
      </span>
    </div>
  );
}
