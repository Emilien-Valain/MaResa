"use client";

import {
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Icon } from "@/components/admin/icons";

export function AdminInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={`admin-field ${className ?? ""}`.trim()}
    />
  );
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const isoToFr = (v: string) => v.replace(ISO, "$3/$2/$1");
const frToIso = (v: string) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};

/** Saisie en JJ/MM/AAAA : barres ajoutées en tapant ; une date ISO collée est convertie. */
export function formatDateTyping(v: string): string {
  if (ISO.test(v)) return isoToFr(v);
  const max = [2, 2, 4];
  const seg = ["", "", ""];
  let i = 0;
  for (const ch of v) {
    // Une barre tapée passe au segment suivant (« 1/5/2027 » reste possible)
    if (ch === "/") {
      if (seg[i] && i < 2) i++;
      continue;
    }
    if (!/\d/.test(ch)) continue;
    // Segment plein : le chiffre déborde sur le suivant au lieu d'être perdu
    if (seg[i].length === max[i]) {
      if (i === 2) break;
      i++;
    }
    seg[i] += ch;
  }
  return seg.slice(0, i + 1).join("/");
}

/**
 * Champ date toujours en JJ/MM/AAAA. Le <input type="date"> natif suit la langue du
 * navigateur (MM/DD/YYYY en anglais) ; on ne garde que son sélecteur, ouvert par le bouton.
 * Le champ envoie JJ/MM/AAAA, converti côté serveur (`dateString`, lib/validation.ts).
 */
export function DateInput({
  defaultValue,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange"> & {
  defaultValue?: string;
}) {
  const [text, setText] = useState(() => formatDateTyping(defaultValue ?? ""));
  const picker = useRef<HTMLInputElement>(null);

  function openPicker() {
    const p = picker.current;
    if (!p) return;
    p.value = frToIso(text);
    try {
      p.showPicker();
    } catch {
      p.focus();
    }
  }

  return (
    <div className="relative">
      <input
        {...rest}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="jj/mm/aaaa"
        pattern="\d{1,2}/\d{1,2}/\d{4}"
        title="Date au format JJ/MM/AAAA"
        value={text}
        onChange={(e) => setText(formatDateTyping(e.target.value))}
        className={`admin-field pr-11 tabular-nums ${className ?? ""}`.trim()}
      />
      <button
        type="button"
        onClick={openPicker}
        aria-label="Ouvrir le calendrier"
        className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-md"
        style={{ color: "var(--admin-text-muted)", background: "none", border: "none" }}
      >
        <Icon.Calendar size={16} />
      </button>
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        className="absolute right-0 bottom-0 w-px h-px opacity-0 pointer-events-none"
        onChange={(e) => e.target.value && setText(isoToFr(e.target.value))}
      />
    </div>
  );
}

export function AdminTextarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const { className, ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`admin-field admin-field--textarea ${className ?? ""}`.trim()}
    />
  );
}

export function AdminSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select
      {...rest}
      className={`admin-field admin-field--select ${className ?? ""}`.trim()}
    >
      {children}
    </select>
  );
}

export function Toggle({
  on,
  onChange,
  ariaLabel,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={on}
      onClick={() => onChange(!on)}
      style={{
        width: 38,
        height: 22,
        borderRadius: 11,
        background: on ? "var(--admin-primary)" : "var(--admin-border)",
        border: "none",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

// Le panneau associé porte role="tabpanel", id={`panel-${active}`}, aria-labelledby={`tab-${active}`}.
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (next: T) => void;
  label: string;
}) {
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = tabs.findIndex((t) => t.id === active);
    const next =
      e.key === "ArrowRight" ? (i + 1) % tabs.length
      : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length
      : e.key === "Home" ? 0
      : e.key === "End" ? tabs.length - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next].id);
    document.getElementById(`tab-${tabs[next].id}`)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex gap-1 mb-6 overflow-x-auto admin-scroll-cue"
      style={{ borderBottom: "1px solid var(--admin-border)" }}
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${t.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={(e) => {
              onChange(t.id);
              e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
            }}
            className="whitespace-nowrap"
            style={{
              padding: "10px 18px",
              background: "none",
              border: "none",
              borderBottom: `2px solid ${
                isActive ? "var(--admin-primary)" : "transparent"
              }`,
              color: isActive
                ? "var(--admin-primary)"
                : "var(--admin-text-muted)",
              fontSize: 13.5,
              fontWeight: 600, // poids fixe : l’onglet actif ne décale pas ses voisins
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
