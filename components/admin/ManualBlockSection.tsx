"use client";

import { useState } from "react";
import { createManualBlock, deleteManualBlock } from "@/lib/actions/rules";
import {
  AdminInput,
  AdminSelect,
  Field,
  SettingsSection,
} from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";
import type { ManualBlockRow } from "./RulesPageClient";

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

interface Props {
  rooms: { id: string; name: string }[];
  blocks: ManualBlockRow[];
}

export default function ManualBlockSection({ rooms, blocks }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  return (
    <SettingsSection
      title="Blocages manuels"
      desc="Bloque une chambre sur une période hors réservation (maintenance, congés…). Apparaît en barré sur le calendrier."
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
            if (isRecurring && selectedDays.length > 0) {
              formData.set("recurrenceDays", selectedDays.join(","));
            }
            await createManualBlock(formData);
            setShowForm(false);
            setIsRecurring(false);
            setSelectedDays([]);
          }}
          className="mb-5"
          style={{
            padding: 14,
            background: "var(--admin-surface-2)",
            borderRadius: 10,
            border: "1px dashed var(--admin-border)",
          }}
        >
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
            <Field label="Date début">
              <AdminInput type="date" name="startDate" required />
            </Field>
            <Field label="Date fin">
              <AdminInput type="date" name="endDate" required />
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
                          background: active ? "#DC2626" : "var(--admin-surface)",
                          border: `1px solid ${active ? "#DC2626" : "var(--admin-border)"}`,
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
                <Field label="Fin de récurrence (optionnel)">
                  <AdminInput type="date" name="recurrenceUntil" />
                </Field>
              </div>
            </>
          )}

          <div className="flex justify-end mt-2">
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
              Créer le blocage
            </button>
          </div>
        </form>
      )}

      {blocks.length === 0 ? (
        <p
          className="text-center py-6 text-[13px]"
          style={{ color: "var(--admin-text-muted)" }}
        >
          Aucun blocage configuré
        </p>
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
                <Icon.X size={16} style={{ color: "#DC2626" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[13.5px] font-semibold"
                  style={{ color: "var(--admin-text)" }}
                >
                  {block.roomName ?? "Toutes les chambres"}
                  {block.recurring && (
                    <span
                      className="ml-2 text-[11px] font-bold"
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
                  className="text-[11.5px]"
                  style={{ color: "var(--admin-text-muted)" }}
                >
                  {block.recurring
                    ? `Chaque ${((block.recurrenceDays as number[]) ?? [])
                        .map((d) => DAY_NAMES[d])
                        .join(", ")} — depuis le ${new Date(block.startDate).toLocaleDateString("fr-FR")}${
                        block.recurrenceUntil
                          ? ` jusqu'au ${new Date(block.recurrenceUntil).toLocaleDateString("fr-FR")}`
                          : " (indéfini)"
                      }`
                    : `${new Date(block.startDate).toLocaleDateString("fr-FR")} → ${new Date(block.endDate).toLocaleDateString("fr-FR")}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Supprimer ce blocage ?"))
                    deleteManualBlock(block.id);
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
