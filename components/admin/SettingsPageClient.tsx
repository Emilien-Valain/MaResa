"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/admin/icons";
import {
  AdminInput,
  Field,
  SettingsSection,
  Tabs,
  Toggle,
} from "@/components/admin/ui";
import EmailSettingsSection from "@/components/admin/EmailSettingsSection";
import LocationSection from "@/components/admin/LocationSection";
import IcalSourcesSection from "@/components/admin/IcalSourcesSection";
import StripeConnectSection from "@/components/admin/StripeConnectSection";
import type { TenantConfig, TemplateName } from "@/lib/tenant-context";

type TabId =
  | "general"
  | "theme"
  | "location"
  | "email"
  | "ical"
  | "stripe";

const TABS: { id: TabId; label: string }[] = [
  { id: "general", label: "Général" },
  { id: "theme", label: "Apparence" },
  { id: "location", label: "Localisation" },
  { id: "email", label: "Emails" },
  { id: "ical", label: "iCal" },
  { id: "stripe", label: "Paiements" },
];

type Room = { id: string; name: string };

type IcalSource = {
  id: string;
  name: string;
  url: string;
  active: boolean;
  roomId: string;
  roomName: string;
  lastSyncAt: string | null;
};

export default function SettingsPageClient({
  tenant,
  config,
  baseUrl,
  rooms,
  icalSources,
  hasStripeAccount,
}: {
  tenant: { id: string; name: string; slug: string; domain: string | null };
  config: TenantConfig;
  baseUrl: string;
  rooms: Room[];
  icalSources: IcalSource[];
  hasStripeAccount: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") as TabId | null;
  const [tab, setTabState] = useState<TabId>(
    urlTab && TABS.some((t) => t.id === urlTab) ? urlTab : "general",
  );

  const setTab = (next: TabId) => {
    setTabState(next);
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="admin-fade-in">
      <header className="mb-6">
        <h1
          className="text-[22px] font-extrabold"
          style={{ color: "var(--admin-text)", letterSpacing: "-0.5px" }}
        >
          Paramètres
        </h1>
        <p
          className="text-[13.5px] mt-1"
          style={{ color: "var(--admin-text-muted)" }}
        >
          Configuration de l&apos;hôtel, intégrations et thème.
        </p>
      </header>

      <Tabs<TabId> tabs={TABS} active={tab} onChange={setTab} />

      <div className="max-w-[760px]">
        {tab === "general" && (
          <GeneralTab tenant={tenant} config={config} />
        )}
        {tab === "theme" && <ThemeTab config={config} />}
        {tab === "location" && (
          <LocationSection
            googleMapsUrl={config.googleMapsUrl}
            latitude={config.latitude}
            longitude={config.longitude}
          />
        )}
        {tab === "email" && (
          <EmailSettingsSection
            confirmationMessage={config.confirmationMessage}
            postStayMessage={config.postStayMessage}
            reviewUrl={config.reviewUrl}
          />
        )}
        {tab === "ical" && (
          <IcalSourcesSection
            baseUrl={baseUrl}
            rooms={rooms}
            sources={icalSources}
          />
        )}
        {tab === "stripe" && (
          <StripeConnectSection hasAccount={hasStripeAccount} />
        )}
      </div>
    </div>
  );
}

/* ── Général ─────────────────────────────────────────────────────────── */

function GeneralTab({
  tenant,
  config,
}: {
  tenant: { id: string; name: string; slug: string; domain: string | null };
  config: TenantConfig;
}) {
  return (
    <>
      <SettingsSection
        title="Informations de l'hôtel"
        desc="Visibles sur le site public et les emails."
      >
        <Field label="Nom de l'hôtel">
          <AdminInput defaultValue={tenant.name} />
        </Field>
        <Field
          label="Slug (sous-domaine)"
          hint="Utilisé pour les URLs internes et l'URL de prévisualisation."
        >
          <AdminInput defaultValue={tenant.slug} />
        </Field>
        <Field
          label="Domaine personnalisé"
          hint="Le domaine principal pointant vers ce tenant."
        >
          <AdminInput defaultValue={tenant.domain ?? ""} />
        </Field>
        <Field label="Titre du hero">
          <AdminInput
            defaultValue={config.heroTitle ?? ""}
            placeholder="Un mas au cœur du Luberon"
          />
        </Field>
        <Field label="Sous-titre">
          <AdminInput
            defaultValue=""
            placeholder="5 chambres d'exception. Piscine, oliveraie et table d'hôtes."
          />
        </Field>
      </SettingsSection>

      <SettingsSection
        title="Contact"
        desc="Affiché en footer et sur la page de réservation."
      >
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Email">
            <AdminInput
              defaultValue={
                ((config as Record<string, unknown>).email as
                  | string
                  | undefined) ?? ""
              }
              type="email"
              placeholder="contact@hotel.fr"
            />
          </Field>
          <Field label="Téléphone">
            <AdminInput
              defaultValue={
                ((config as Record<string, unknown>).phone as
                  | string
                  | undefined) ?? ""
              }
              type="tel"
              placeholder="+33 4 90 00 00 00"
            />
          </Field>
        </div>
      </SettingsSection>
    </>
  );
}

/* ── Apparence ──────────────────────────────────────────────────────── */

const TEMPLATES: {
  id: TemplateName;
  name: string;
  desc: string;
  bg: string;
  accent: string;
}[] = [
  {
    id: "classic",
    name: "Classic",
    desc: "Chaleureux, terracotta",
    bg: "#1C3A2C",
    accent: "#D4784A",
  },
  {
    id: "boutique",
    name: "Boutique",
    desc: "Luxe, noir & or",
    bg: "#0E0E0C",
    accent: "#C49A52",
  },
];

function ThemeTab({ config }: { config: TenantConfig }) {
  const [template, setTemplate] = useState<TemplateName>(
    config.template ?? "classic",
  );
  const [primary, setPrimary] = useState(config.primaryColor ?? "#1C3A2C");
  const [accent, setAccent] = useState(config.secondaryColor ?? "#D4784A");

  return (
    <>
      <SettingsSection
        title="Template"
        desc="Le design utilisé pour le site public. Chaque template a sa propre identité visuelle."
      >
        <div className="grid grid-cols-2 gap-3.5">
          {TEMPLATES.map((t) => {
            const selected = template === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplate(t.id)}
                className="text-left relative"
                style={{
                  background: "var(--admin-surface)",
                  border: `2px solid ${
                    selected ? "var(--admin-primary)" : "var(--admin-border)"
                  }`,
                  borderRadius: 10,
                  padding: 16,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div
                  style={{
                    height: 60,
                    borderRadius: 6,
                    background: t.bg,
                    marginBottom: 12,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      bottom: 8,
                      left: 8,
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      background: t.accent,
                    }}
                  />
                </div>
                <div
                  className="text-[14px] font-bold mb-0.5"
                  style={{ color: "var(--admin-text)" }}
                >
                  {t.name}
                </div>
                <div
                  className="text-[12px]"
                  style={{ color: "var(--admin-text-muted)" }}
                >
                  {t.desc}
                </div>
                {selected && (
                  <span
                    className="absolute flex items-center justify-center"
                    style={{
                      top: 10,
                      right: 10,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "var(--admin-primary)",
                    }}
                  >
                    <Icon.Check size={11} style={{ color: "#fff" }} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Couleurs"
        desc="Personnalise la palette du template choisi."
      >
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Couleur principale">
            <ColorRow value={primary} onChange={setPrimary} />
          </Field>
          <Field label="Couleur d'accent">
            <ColorRow value={accent} onChange={setAccent} />
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Logo"
        desc="Format recommandé : SVG ou PNG transparent, hauteur 80px."
      >
        <div className="flex items-center gap-4">
          <div
            className="flex items-center justify-center"
            style={{
              width: 120,
              height: 80,
              background: "var(--admin-surface-2)",
              border: "1px dashed var(--admin-border)",
              borderRadius: 8,
              color: "var(--admin-text-subtle)",
              fontSize: 11,
            }}
          >
            {config.logoUrl ? "logo actuel" : "aucun logo"}
          </div>
          <div>
            <button
              type="button"
              style={{
                padding: "8px 16px",
                background: "var(--admin-primary)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Remplacer
            </button>
            <button
              type="button"
              className="ml-2"
              style={{
                padding: "8px 16px",
                background: "transparent",
                color: "var(--admin-text-muted)",
                border: "1px solid var(--admin-border)",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Supprimer
            </button>
          </div>
        </div>
      </SettingsSection>
    </>
  );
}

function ColorRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        style={{
          width: 38,
          height: 38,
          borderRadius: 8,
          background: value,
          border: "1px solid var(--admin-border)",
          flexShrink: 0,
        }}
      />
      <AdminInput value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

