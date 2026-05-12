"use client";

import type {
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
} from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div
      data-admin
      className="min-h-screen flex items-center justify-center p-5"
      style={{
        background:
          "linear-gradient(135deg, var(--admin-bg) 0%, var(--admin-surface-2) 100%)",
      }}
    >
      <div
        className="admin-fade-in w-full"
        style={{
          background: "var(--admin-surface)",
          border: "1px solid var(--admin-border)",
          borderRadius: 16,
          padding: 40,
          maxWidth: 400,
          boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
        }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div
            className="flex items-center justify-center"
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "var(--admin-sidebar-bg)",
            }}
          >
            <span
              className="text-white font-extrabold"
              style={{ fontSize: 17, letterSpacing: "-0.5px" }}
            >
              M
            </span>
          </div>
          <div className="leading-tight">
            <div
              className="font-extrabold"
              style={{
                color: "var(--admin-text)",
                fontSize: 17,
                letterSpacing: "-0.4px",
              }}
            >
              MaRésa
            </div>
            <div
              className="text-[11.5px] font-medium"
              style={{ color: "var(--admin-text-muted)" }}
            >
              Administration
            </div>
          </div>
        </div>

        {children}

        <div
          className="text-center mt-6 pt-5 text-[11.5px]"
          style={{
            borderTop: "1px solid var(--admin-border)",
            color: "var(--admin-text-subtle)",
          }}
        >
          Plateforme MaRésa
        </div>
      </div>
    </div>
  );
}

export function AuthField({
  label,
  error,
  children,
}: {
  label: string;
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
    </div>
  );
}

export function AuthInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { style, onFocus, onBlur, ...rest } = props;
  return (
    <input
      {...rest}
      style={{
        width: "100%",
        padding: "9px 12px",
        border: "1.5px solid var(--admin-border)",
        borderRadius: 8,
        fontSize: 13.5,
        color: "var(--admin-text)",
        background: "var(--admin-surface)",
        outline: "none",
        fontFamily: "inherit",
        transition: "border-color 0.15s",
        ...(style ?? {}),
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--admin-primary)";
        onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--admin-border)";
        onBlur?.(e);
      }}
    />
  );
}

export function AuthPrimaryButton({
  children,
  loading,
  ...rest
}: {
  children: ReactNode;
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { style, disabled, ...buttonProps } = rest;
  const merged: CSSProperties = {
    width: "100%",
    padding: "12px",
    background: loading || disabled
      ? "var(--admin-text-muted)"
      : "var(--admin-primary)",
    color: "#fff",
    border: "none",
    borderRadius: 9,
    fontSize: 14,
    fontWeight: 700,
    cursor: loading || disabled ? "not-allowed" : "pointer",
    transition: "background 0.15s",
    ...(style ?? {}),
  };
  return (
    <button
      {...buttonProps}
      disabled={disabled || loading}
      style={merged}
    >
      {children}
    </button>
  );
}

export function AuthGhostButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { style, ...buttonProps } = rest;
  const merged: CSSProperties = {
    width: "100%",
    padding: 10,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "var(--admin-text-muted)",
    fontSize: 13,
    fontWeight: 500,
    ...(style ?? {}),
  };
  return (
    <button {...buttonProps} style={merged}>
      {children}
    </button>
  );
}
