"use client";

import { useState } from "react";
import { createBookingRule, deleteBookingRule } from "@/lib/actions/rules";
import {
  AdminInput,
  AdminSelect,
  Field,
  SettingsSection,
} from "@/components/admin/ui";
import type { BookingRuleRow } from "./RulesPageClient";

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
  rules: BookingRuleRow[];
}

export default function BookingRuleSection({ rooms, rules }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [checkInDays, setCheckInDays] = useState<number[]>([]);
  const [checkOutDays, setCheckOutDays] = useState<number[]>([]);

  const toggleDay = (
    days: number[],
    setDays: (d: number[]) => void,
    day: number,
  ) => {
    setDays(
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
    );
  };

  return (
    <SettingsSection
      title="Règles de séjour"
      desc="Durée min/max, jours d'arrivée et de départ autorisés."
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
            if (checkInDays.length > 0) {
              formData.set("allowedCheckInDays", checkInDays.join(","));
            }
            if (checkOutDays.length > 0) {
              formData.set("allowedCheckOutDays", checkOutDays.join(","));
            }
            await createBookingRule(formData);
            setShowForm(false);
            setCheckInDays([]);
            setCheckOutDays([]);
          }}
          className="mb-5"
          style={{
            padding: 14,
            background: "var(--admin-surface-2)",
            borderRadius: 10,
            border: "1px dashed var(--admin-border)",
          }}
        >
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Saison — début (optionnel)">
              <AdminInput type="date" name="validFrom" />
            </Field>
            <Field label="Saison — fin (optionnel)">
              <AdminInput type="date" name="validTo" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nuits minimum">
              <AdminInput type="number" name="minStay" min="1" placeholder="ex: 2" />
            </Field>
            <Field label="Nuits maximum">
              <AdminInput type="number" name="maxStay" min="1" placeholder="ex: 14" />
            </Field>
          </div>

          <Field
            label="Jours d'arrivée autorisés"
            hint="Aucun sélectionné = tous les jours autorisés"
          >
            <div className="flex gap-2">
              {DAY_NAMES.map((name, i) => {
                const active = checkInDays.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(checkInDays, setCheckInDays, i)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: active
                        ? "var(--admin-primary)"
                        : "var(--admin-surface)",
                      border: `1px solid ${active ? "var(--admin-primary)" : "var(--admin-border)"}`,
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

          <Field
            label="Jours de départ autorisés"
            hint="Aucun sélectionné = tous les jours autorisés"
          >
            <div className="flex gap-2">
              {DAY_NAMES.map((name, i) => {
                const active = checkOutDays.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(checkOutDays, setCheckOutDays, i)}
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
          Aucune règle configurée
        </p>
      ) : (
        <div>
          {rules.map((rule, i) => (
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
              <div className="min-w-0">
                <p
                  className="text-[13.5px] font-semibold"
                  style={{ color: "var(--admin-text)" }}
                >
                  {rule.roomName ?? "Global (toutes les chambres)"}
                  {rule.validFrom && (
                    <span
                      className="ml-2 text-[11px] font-bold"
                      style={{
                        padding: "2px 8px",
                        borderRadius: 12,
                        background: "var(--admin-primary-light)",
                        color: "var(--admin-primary)",
                      }}
                    >
                      Saisonnier
                    </span>
                  )}
                </p>
                <p
                  className="text-[11.5px] space-x-2"
                  style={{ color: "var(--admin-text-muted)" }}
                >
                  {rule.minStay && <span>Min {rule.minStay} nuit(s)</span>}
                  {rule.maxStay && <span>Max {rule.maxStay} nuit(s)</span>}
                  {Array.isArray(rule.allowedCheckInDays) && (
                    <span>
                      Arrivée :{" "}
                      {(rule.allowedCheckInDays as number[])
                        .map((d) => DAY_NAMES_FR[d])
                        .join(", ")}
                    </span>
                  )}
                  {Array.isArray(rule.allowedCheckOutDays) && (
                    <span>
                      Départ :{" "}
                      {(rule.allowedCheckOutDays as number[])
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
              <button
                type="button"
                onClick={() => {
                  if (confirm("Supprimer cette règle ?"))
                    deleteBookingRule(rule.id);
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
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
