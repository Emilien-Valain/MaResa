"use client";

import { useState } from "react";
import {
  createPricingRule,
  deletePricingRule,
  togglePricingRule,
} from "@/lib/actions/rules";
import {
  AdminInput,
  AdminSelect,
  Field,
  SettingsSection,
} from "@/components/admin/ui";
import type { PricingRuleRow } from "./RulesPageClient";

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
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

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  return (
    <SettingsSection
      title="Tarification dynamique"
      desc="Prix saisonniers, majorations week-end, promotions. Les règles à plus haute priorité gagnent en cas de conflit."
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
      {showForm && (
        <form
          action={async (formData) => {
            if (selectedDays.length > 0) {
              formData.set("daysOfWeek", selectedDays.join(","));
            }
            await createPricingRule(formData);
            setShowForm(false);
            setSelectedDays([]);
            setPriceType("fixed");
          }}
          className="mb-5"
          style={{
            padding: 14,
            background: "var(--admin-surface-2)",
            borderRadius: 10,
            border: "1px dashed var(--admin-border)",
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nom de la règle">
              <AdminInput
                type="text"
                name="name"
                required
                placeholder="ex: Haute saison"
              />
            </Field>
            <Field label="Chambre">
              <AdminSelect name="roomId">
                <option value="">Toutes les chambres (global)</option>
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
              <AdminInput type="date" name="validFrom" />
            </Field>
            <Field label="Période — fin (optionnel)">
              <AdminInput type="date" name="validTo" />
            </Field>
          </div>

          <Field
            label="Jours de la semaine (optionnel)"
            hint="Aucun sélectionné = tous les jours"
          >
            <div className="flex gap-2">
              {DAY_NAMES.map((name, i) => {
                const active = selectedDays.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
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
              <Field label="Prix fixe (€/nuit)">
                <AdminInput
                  type="text"
                  name="fixedPrice"
                  placeholder="ex: 150"
                />
              </Field>
            </div>
          ) : (
            <div className="max-w-xs">
              <Field
                label="Modificateur (%)"
                hint="Positif = majoration, négatif = promotion"
              >
                <AdminInput
                  type="text"
                  name="percentageModifier"
                  placeholder="ex: 30 ou -15"
                />
              </Field>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              style={{
                padding: "9px 18px",
                background: "var(--admin-primary)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Créer la règle
            </button>
          </div>
        </form>
      )}

      {rules.length === 0 ? (
        <p
          className="text-center py-6 text-[13px]"
          style={{ color: "var(--admin-text-muted)" }}
        >
          Aucune règle tarifaire configurée
        </p>
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
                        className="ml-2 text-[11px] font-bold"
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
                      className="ml-2 text-[11.5px]"
                      style={{ color: "var(--admin-text-muted)" }}
                    >
                      {rule.roomName ?? "Global"}
                    </span>
                  </p>
                  <p
                    className="text-[11.5px] space-x-2"
                    style={{ color: "var(--admin-text-muted)" }}
                  >
                    {rule.fixedPrice && (
                      <span>
                        {parseFloat(rule.fixedPrice).toFixed(0)} €/nuit
                      </span>
                    )}
                    {rule.percentageModifier && (
                      <span style={{ color: isAdjPositive ? "#16A34A" : "#DC2626" }}>
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
                        {new Date(rule.validFrom).toLocaleDateString("fr-FR")} →{" "}
                        {rule.validTo
                          ? new Date(rule.validTo).toLocaleDateString("fr-FR")
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
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Supprimer cette règle ?"))
                        deletePricingRule(rule.id);
                    }}
                    className="text-[12px] font-semibold"
                    style={{
                      color: "#DC2626",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SettingsSection>
  );
}
