"use client";

import { formatEuros } from "@/lib/utils";

import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { useState } from "react";
import { useFormAction } from "@/components/admin/useFormAction";
import {
  createPricingRule,
  deletePricingRule,
  togglePricingRule,
} from "@/lib/actions/rules";
import {
  AdminInput,
  AdminSelect,
  DateInput,
  EmptyState,
  Field,
  SettingsSection,
  StatusBanner,
} from "@/components/admin/ui";
import type { PricingRuleRow } from "./RulesPageClient";

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
// Indices JS (0 = dimanche), affichés dans l'ordre de la semaine française.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES_FR = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

interface Props {
  rooms: { id: string; name: string }[];
  rules: PricingRuleRow[];
}

export default function PricingRuleSection({ rooms, rules }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [priceType, setPriceType] = useState<"fixed" | "percentage">("fixed");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const form = useFormAction(createPricingRule, {
    prepare: (fd) => {
      if (selectedDays.length > 0) fd.set("daysOfWeek", selectedDays.join(","));
    },
    onSuccess: () => {
      setShowForm(false);
      setSelectedDays([]);
      setPriceType("fixed");
    },
  });

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  return (
    <SettingsSection
      title="Tarification dynamique"
      desc="Prix saisonniers, majorations week-end, promotions. Si deux règles visent la même nuit, la plus précise l'emporte : une chambre plutôt que toutes, des jours choisis plutôt que tous, une période courte plutôt que longue."
      action={
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: "7px 14px",
            background: showForm ? "transparent" : "var(--admin-primary)",
            color: showForm ? "var(--admin-text-muted)" : "#fff",
            border: showForm ? "1px solid var(--admin-border)" : "none",
            borderRadius: 7,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {showForm ? "Annuler" : "Ajouter"}
        </button>
      }
    >
      {form.saved && !showForm && (
        <StatusBanner variant="success">Règle tarifaire ajoutée.</StatusBanner>
      )}
      {showForm && (
        <form
          onSubmit={form.onSubmit}
          className="mb-5"
          style={{
            padding: 14,
            background: "var(--admin-surface-2)",
            borderRadius: 10,
            border: "1px dashed var(--admin-border)",
          }}
        >
          {form.error && <StatusBanner variant="error">{form.error}</StatusBanner>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nom de la règle" error={form.fieldError("name")}>
              <AdminInput
                type="text"
                name="name"
                required
                placeholder="ex: Haute saison"
              />
            </Field>
            <Field label="Chambre">
              <AdminSelect name="roomId">
                <option value="">Toutes les chambres</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </AdminSelect>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Période — début (optionnel)">
              <DateInput name="validFrom" />
            </Field>
            <Field label="Période — fin (optionnel)" error={form.fieldError("validTo")}>
              <DateInput name="validTo" />
            </Field>
          </div>

          <Field
            label="Jours de la semaine (optionnel)"
            hint="Aucun sélectionné = tous les jours"
          >
            <div className="flex gap-2">
              {WEEK_ORDER.map((i) => {
                const name = DAY_NAMES[i];
                const active = selectedDays.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleDay(i)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: active
                        ? "var(--admin-accent)"
                        : "var(--admin-surface)",
                      border: `1px solid ${active ? "var(--admin-accent)" : "var(--admin-border)"}`,
                      color: active ? "#fff" : "var(--admin-text-muted)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Type de tarification">
            <div className="flex gap-4">
              <label
                className="flex items-center gap-2 text-[13px]"
                style={{ color: "var(--admin-text)" }}
              >
                <input
                  type="radio"
                  checked={priceType === "fixed"}
                  onChange={() => setPriceType("fixed")}
                  style={{ accentColor: "var(--admin-primary)" }}
                />
                Prix fixe (€/nuit)
              </label>
              <label
                className="flex items-center gap-2 text-[13px]"
                style={{ color: "var(--admin-text)" }}
              >
                <input
                  type="radio"
                  checked={priceType === "percentage"}
                  onChange={() => setPriceType("percentage")}
                  style={{ accentColor: "var(--admin-primary)" }}
                />
                Modificateur (%)
              </label>
            </div>
          </Field>

          {priceType === "fixed" ? (
            <div className="max-w-xs">
              <Field label="Prix fixe (€/nuit)" error={form.fieldError("fixedPrice")}>
                <AdminInput
                  type="text"
                  name="fixedPrice"
                  required
                  inputMode="decimal"
                  placeholder="ex: 150"
                />
              </Field>
            </div>
          ) : (
            <div className="max-w-xs">
              <Field
                label="Modificateur (%)"
                hint="Positif = majoration, négatif = promotion"
                error={form.fieldError("percentageModifier")}
              >
                <AdminInput
                  type="text"
                  name="percentageModifier"
                  required
                  placeholder="ex: 30 ou -15"
                />
              </Field>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={form.pending}
              style={{
                padding: "9px 18px",
                background: "var(--admin-primary)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: form.pending ? "wait" : "pointer",
                opacity: form.pending ? 0.7 : 1,
              }}
            >
              {form.pending ? "Création…" : "Créer la règle"}
            </button>
          </div>
        </form>
      )}

      {rules.length === 0 && !showForm ? (
        <EmptyState
          compact
          title="Aucune règle tarifaire configurée"
          example="« Haute saison » à 120 € la nuit du 1er juillet au 31 août, ou −15 % en semaine de novembre à mars."
        >
          Toutes les nuits sont facturées au prix de base de chaque chambre.
        </EmptyState>
      ) : (
        <div>
          {rules.map((rule, i) => {
            const isAdjPositive = rule.percentageModifier
              ? parseFloat(rule.percentageModifier) > 0
              : true;
            return (
              <div
                key={rule.id}
                className="flex items-center justify-between py-3"
                style={{
                  borderBottom:
                    i < rules.length - 1
                      ? "1px solid var(--admin-border-light)"
                      : "none",
                }}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[13.5px] font-semibold"
                    style={{ color: "var(--admin-text)" }}
                  >
                    <span
                      style={{
                        textDecoration: rule.active ? "none" : "line-through",
                        color: rule.active
                          ? "var(--admin-text)"
                          : "var(--admin-text-subtle)",
                      }}
                    >
                      {rule.name}
                    </span>
                    {!rule.active && (
                      <span
                        className="ml-2 text-[12px] font-bold"
                        style={{
                          padding: "2px 8px",
                          borderRadius: 12,
                          background: "var(--admin-border-light)",
                          color: "var(--admin-text-muted)",
                        }}
                      >
                        Désactivée
                      </span>
                    )}
                    <span
                      className="ml-2 text-[12px]"
                      style={{ color: "var(--admin-text-muted)" }}
                    >
                      {rule.roomName ?? "Global"}
                    </span>
                  </p>
                  <p
                    className="text-[12px] space-x-2"
                    style={{ color: "var(--admin-text-muted)" }}
                  >
                    {rule.fixedPrice && (
                      <span>
                        {formatEuros(rule.fixedPrice)}/nuit
                      </span>
                    )}
                    {rule.percentageModifier && (
                      <span style={{ color: isAdjPositive ? "#15803D" : "var(--admin-danger)" }}>
                        {isAdjPositive ? "+" : ""}
                        {parseFloat(rule.percentageModifier).toFixed(0)}%
                      </span>
                    )}
                    {Array.isArray(rule.daysOfWeek) && (
                      <span>
                        {(rule.daysOfWeek as number[])
                          .map((d) => DAY_NAMES_FR[d])
                          .join(", ")}
                      </span>
                    )}
                    {rule.validFrom && (
                      <span>
                        {new Date(rule.validFrom).toLocaleDateString("fr-FR", { timeZone: "UTC" })} →{" "}
                        {rule.validTo
                          ? new Date(rule.validTo).toLocaleDateString("fr-FR", { timeZone: "UTC" })
                          : "…"}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => togglePricingRule(rule.id)}
                    className="text-[12px] font-semibold"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: rule.active
                        ? "var(--admin-text-muted)"
                        : "#16A34A",
                    }}
                  >
                    {rule.active ? "Désactiver" : "Activer"}
                  </button>
                  <ConfirmButton
                    title={"Supprimer cette règle de tarification ?"}
                    message="Les prochaines réservations seront calculées sans elle. Les réservations existantes gardent leur prix."
                    confirmLabel="Supprimer la règle"
                    onConfirm={() => deletePricingRule(rule.id)}
                    className="text-[12px] font-semibold"
                    style={{
                      color: "var(--admin-danger)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Supprimer
                  </ConfirmButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SettingsSection>
  );
}
