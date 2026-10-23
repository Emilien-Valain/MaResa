"use client";

import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { useState } from "react";
import { useFormAction } from "@/components/admin/useFormAction";
import { createManualBlock, deleteManualBlock } from "@/lib/actions/rules";
import {
  AdminSelect,
  DateInput,
  EmptyState,
  Field,
  SettingsSection,
  StatusBanner,
} from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";
import type { ManualBlockRow } from "./RulesPageClient";

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
// Indices JS (0 = dimanche), affichés dans l'ordre de la semaine française.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface Props {
  rooms: { id: string; name: string }[];
  blocks: ManualBlockRow[];
}

export default function ManualBlockSection({ rooms, blocks }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const form = useFormAction(createManualBlock, {
    prepare: (fd) => {
      if (isRecurring && selectedDays.length > 0) fd.set("recurrenceDays", selectedDays.join(","));
    },
    onSuccess: () => {
      setShowForm(false);
      setIsRecurring(false);
      setSelectedDays([]);
    },
  });

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  return (
    <SettingsSection
      title="Blocages manuels"
      desc="Rendez une chambre indisponible sur une période (travaux, congés…). Elle apparaît hachurée sur le calendrier."
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
        <StatusBanner variant="success">Blocage ajouté.</StatusBanner>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <Field label="Date début" error={form.fieldError("startDate")}>
              <DateInput name="startDate" required />
            </Field>
            <Field label="Date fin" error={form.fieldError("endDate")}>
              <DateInput name="endDate" required />
            </Field>
          </div>

          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="recurring"
              name="recurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              style={{ accentColor: "var(--admin-primary)" }}
            />
            <span
              className="text-[13px]"
              style={{ color: "var(--admin-text)" }}
            >
              Récurrent (chaque semaine)
            </span>
          </label>

          {isRecurring && (
            <>
              <input type="hidden" name="recurrenceType" value="weekly" />
              <Field label="Jours bloqués">
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
                          background: active ? "var(--admin-danger)" : "var(--admin-surface)",
                          border: `1px solid ${active ? "var(--admin-danger)" : "var(--admin-border)"}`,
                          color: active ? "#fff" : "var(--admin-text-muted)",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <div className="max-w-xs">
                <Field label="Fin de récurrence (optionnel)" error={form.fieldError("recurrenceUntil")}>
                  <DateInput name="recurrenceUntil" />
                </Field>
              </div>
            </>
          )}

          <div className="flex justify-end mt-2">
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
              {form.pending ? "Création…" : "Créer le blocage"}
            </button>
          </div>
        </form>
      )}

      {blocks.length === 0 && !showForm ? (
        <EmptyState
          compact
          title="Aucun blocage configuré"
          example="fermeture annuelle du 5 au 20 janvier, ou une chambre en travaux."
        >
          Bloquez des dates quand une chambre ne peut pas être louée : elles ne seront plus
          réservables sur votre site.
        </EmptyState>
      ) : (
        <div>
          {blocks.map((block, i) => (
            <div
              key={block.id}
              className="flex items-center gap-3 py-3"
              style={{
                borderBottom:
                  i < blocks.length - 1
                    ? "1px solid var(--admin-border-light)"
                    : "none",
              }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "#FEE2E2",
                }}
              >
                <Icon.X size={16} style={{ color: "var(--admin-danger)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[13.5px] font-semibold"
                  style={{ color: "var(--admin-text)" }}
                >
                  {block.roomName ?? "Toutes les chambres"}
                  {block.recurring && (
                    <span
                      className="ml-2 text-[12px] font-bold"
                      style={{
                        padding: "2px 8px",
                        borderRadius: 12,
                        background: "#FEF3C7",
                        color: "#92400E",
                      }}
                    >
                      Récurrent
                    </span>
                  )}
                </p>
                <p
                  className="text-[12px]"
                  style={{ color: "var(--admin-text-muted)" }}
                >
                  {block.recurring
                    ? `Chaque ${((block.recurrenceDays as number[]) ?? [])
                        .map((d) => DAY_NAMES[d])
                        .join(", ")} — depuis le ${new Date(block.startDate).toLocaleDateString("fr-FR", { timeZone: "UTC" })}${
                        block.recurrenceUntil
                          ? ` jusqu'au ${new Date(block.recurrenceUntil).toLocaleDateString("fr-FR", { timeZone: "UTC" })}`
                          : " (indéfini)"
                      }`
                    : `${new Date(block.startDate).toLocaleDateString("fr-FR", { timeZone: "UTC" })} → ${new Date(block.endDate).toLocaleDateString("fr-FR", { timeZone: "UTC" })}`}
                </p>
              </div>
              <ConfirmButton
                title={"Supprimer ce blocage ?"}
                message="Ces dates redeviendront réservables sur le site, sauf si une autre réservation ou un autre blocage les occupe."
                confirmLabel="Supprimer le blocage"
                onConfirm={() => deleteManualBlock(block.id)}
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
