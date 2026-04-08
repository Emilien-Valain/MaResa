"use client";

import { useState } from "react";
import { createBookingRule, deleteBookingRule } from "@/lib/actions/rules";
import type { BookingRuleRow } from "./RulesPageClient";

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const DAY_NAMES_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

const inputClass =
  "w-full px-3 py-2 border border-warm-300 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-amber-accent/40 focus:border-amber-accent";

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
    <div className="bg-white border border-warm-300 rounded-sm shadow-sm">
      <div className="px-6 py-4 border-b border-warm-200 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold text-warm-950">
            Règles de séjour
          </h2>
          <p className="text-xs text-warm-500 mt-0.5">
            Durée min/max, jours d&apos;arrivée et de départ autorisés
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
          className="px-6 py-4 border-b border-warm-200 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-warm-800 mb-1">
                Chambre
              </label>
              <select name="roomId" className={inputClass}>
                <option value="">Toutes les chambres (global)</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-warm-800 mb-1">
                Saison — début (optionnel)
              </label>
              <input type="date" name="validFrom" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-warm-800 mb-1">
                Saison — fin (optionnel)
              </label>
              <input type="date" name="validTo" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-warm-800 mb-1">
                Nuits minimum
              </label>
              <input
                type="number"
                name="minStay"
                min="1"
                placeholder="ex: 2"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-warm-800 mb-1">
                Nuits maximum
              </label>
              <input
                type="number"
                name="maxStay"
                min="1"
                placeholder="ex: 14"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-800 mb-2">
              Jours d&apos;arrivée autorisés
            </label>
            <div className="flex gap-2">
              {DAY_NAMES.map((name, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(checkInDays, setCheckInDays, i)}
                  className={`w-10 h-10 rounded-sm text-xs font-medium transition-colors ${
                    checkInDays.includes(i)
                      ? "bg-emerald-500 text-white"
                      : "bg-warm-100 text-warm-600 hover:bg-warm-200"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <p className="text-xs text-warm-400 mt-1">
              Aucun sélectionné = tous les jours autorisés
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-800 mb-2">
              Jours de départ autorisés
            </label>
            <div className="flex gap-2">
              {DAY_NAMES.map((name, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(checkOutDays, setCheckOutDays, i)}
                  className={`w-10 h-10 rounded-sm text-xs font-medium transition-colors ${
                    checkOutDays.includes(i)
                      ? "bg-sky-500 text-white"
                      : "bg-warm-100 text-warm-600 hover:bg-warm-200"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <p className="text-xs text-warm-400 mt-1">
              Aucun sélectionné = tous les jours autorisés
            </p>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-sm text-sm font-medium bg-warm-900 text-warm-50 hover:bg-warm-800 transition-colors"
          >
            Créer la règle
          </button>
        </form>
      )}

      {/* Liste */}
      {rules.length === 0 ? (
        <p className="px-6 py-8 text-sm text-warm-400 text-center">
          Aucune règle configurée
        </p>
      ) : (
        <div className="divide-y divide-warm-100">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="px-6 py-3 flex items-center justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-warm-900">
                  {rule.roomName ?? "Global (toutes les chambres)"}
                  {rule.validFrom && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-sm">
                      Saisonnier
                    </span>
                  )}
                </p>
                <p className="text-xs text-warm-500 space-x-2">
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
                onClick={() => {
                  if (confirm("Supprimer cette règle ?"))
                    deleteBookingRule(rule.id);
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
