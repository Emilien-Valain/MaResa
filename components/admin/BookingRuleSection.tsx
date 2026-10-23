"use client";

import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { useState } from "react";
import { useFormAction } from "@/components/admin/useFormAction";
import { createBookingRule, deleteBookingRule } from "@/lib/actions/rules";
import {
  AdminInput,
  AdminSelect,
  DateInput,
  EmptyState,
  Field,
  SettingsSection,
  StatusBanner,
} from "@/components/admin/ui";
import type { BookingRuleRow } from "./RulesPageClient";

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
  rules: BookingRuleRow[];
}

export default function BookingRuleSection({ rooms, rules }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [checkInDays, setCheckInDays] = useState<number[]>([]);
  const [checkOutDays, setCheckOutDays] = useState<number[]>([]);
  const form = useFormAction(createBookingRule, {
    prepare: (fd) => {
      if (checkInDays.length > 0) fd.set("allowedCheckInDays", checkInDays.join(","));
      if (checkOutDays.length > 0) fd.set("allowedCheckOutDays", checkOutDays.join(","));
    },
    onSuccess: () => {
      setShowForm(false);
      setCheckInDays([]);
      setCheckOutDays([]);
    },
  });

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
      {form.saved && !showForm && (
        <StatusBanner variant="success">Règle de réservation ajoutée.</StatusBanner>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Saison — début (optionnel)">
              <DateInput name="validFrom" />
            </Field>
            <Field label="Saison — fin (optionnel)" error={form.fieldError("validTo")}>
              <DateInput name="validTo" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nuits minimum" error={form.fieldError("minStay")}>
              <AdminInput type="number" name="minStay" min="1" placeholder="ex: 2" />
            </Field>
            <Field label="Nuits maximum" error={form.fieldError("maxStay")}>
              <AdminInput type="number" name="maxStay" min="1" placeholder="ex: 14" />
            </Field>
          </div>

          <Field
            label="Jours d'arrivée autorisés"
            hint="Aucun sélectionné = tous les jours autorisés"
          >
            <div className="flex gap-2">
              {WEEK_ORDER.map((i) => {
                const name = DAY_NAMES[i];
                const active = checkInDays.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={active}
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
              {WEEK_ORDER.map((i) => {
                const name = DAY_NAMES[i];
                const active = checkOutDays.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={active}
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
          title="Aucune règle configurée"
          example="en juillet-août, 7 nuits minimum avec arrivée et départ le samedi."
        >
          Sans règle, un client peut réserver une seule nuit, en arrivant n’importe quel jour.
        </EmptyState>
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
                      className="ml-2 text-[12px] font-bold"
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
                  className="text-[12px] space-x-2"
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
                      {new Date(rule.validFrom).toLocaleDateString("fr-FR", { timeZone: "UTC" })} →{" "}
                      {rule.validTo
                        ? new Date(rule.validTo).toLocaleDateString("fr-FR", { timeZone: "UTC" })
                        : "…"}
                    </span>
                  )}
                </p>
              </div>
              <ConfirmButton
                title={"Supprimer cette règle de réservation ?"}
                message="Ses contraintes (durée minimale, jours d’arrivée…) ne s’appliqueront plus aux nouvelles réservations du site."
                confirmLabel="Supprimer la règle"
                onConfirm={() => deleteBookingRule(rule.id)}
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
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
