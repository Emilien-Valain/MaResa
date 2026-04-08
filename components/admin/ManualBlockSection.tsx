"use client";

import { useState } from "react";
import { createManualBlock, deleteManualBlock } from "@/lib/actions/rules";
import type { ManualBlockRow } from "./RulesPageClient";

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const inputClass =
  "w-full px-3 py-2 border border-warm-300 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-amber-accent/40 focus:border-amber-accent";

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
    <div className="bg-white border border-warm-300 rounded-sm shadow-sm">
      <div className="px-6 py-4 border-b border-warm-200 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold text-warm-950">
            Blocages manuels
          </h2>
          <p className="text-xs text-warm-500 mt-0.5">
            Bloquer des dates pour empêcher les réservations
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded-sm text-sm font-medium bg-warm-900 text-warm-50 hover:bg-warm-800 transition-colors"
        >
          {showForm ? "Annuler" : "Ajouter"}
        </button>
      </div>

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
          className="px-6 py-4 border-b border-warm-200 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-warm-800 mb-1">
                Chambre
              </label>
              <select name="roomId" className={inputClass}>
                <option value="">Toutes les chambres</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-warm-800 mb-1">
                Date début
              </label>
              <input type="date" name="startDate" required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-warm-800 mb-1">
                Date fin
              </label>
              <input type="date" name="endDate" required className={inputClass} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recurring"
              name="recurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded-sm border-warm-300"
            />
            <label htmlFor="recurring" className="text-sm text-warm-700">
              Récurrent (chaque semaine)
            </label>
          </div>

          {isRecurring && (
            <div className="space-y-3">
              <input type="hidden" name="recurrenceType" value="weekly" />
              <div>
                <label className="block text-sm font-medium text-warm-800 mb-2">
                  Jours bloqués
                </label>
                <div className="flex gap-2">
                  {DAY_NAMES.map((name, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`w-10 h-10 rounded-sm text-xs font-medium transition-colors ${
                        selectedDays.includes(i)
                          ? "bg-red-500 text-white"
                          : "bg-warm-100 text-warm-600 hover:bg-warm-200"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-w-xs">
                <label className="block text-sm font-medium text-warm-800 mb-1">
                  Fin de récurrence (optionnel)
                </label>
                <input type="date" name="recurrenceUntil" className={inputClass} />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="px-4 py-2 rounded-sm text-sm font-medium bg-warm-900 text-warm-50 hover:bg-warm-800 transition-colors"
          >
            Créer le blocage
          </button>
        </form>
      )}

      {/* Liste */}
      {blocks.length === 0 ? (
        <p className="px-6 py-8 text-sm text-warm-400 text-center">
          Aucun blocage configuré
        </p>
      ) : (
        <div className="divide-y divide-warm-100">
          {blocks.map((block) => (
            <div
              key={block.id}
              className="px-6 py-3 flex items-center justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-warm-900">
                  {block.roomName ?? "Toutes les chambres"}
                  {block.recurring && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-sm">
                      Récurrent
                    </span>
                  )}
                </p>
                <p className="text-xs text-warm-500">
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
                onClick={() => {
                  if (confirm("Supprimer ce blocage ?")) deleteManualBlock(block.id);
                }}
                className="text-xs text-red-600 hover:text-red-800 font-medium"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
