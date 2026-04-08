"use client";

import { useState } from "react";
import {
  createPricingRule,
  deletePricingRule,
  togglePricingRule,
} from "@/lib/actions/rules";
import type { PricingRuleRow } from "./RulesPageClient";

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const DAY_NAMES_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

const inputClass =
  "w-full px-3 py-2 border border-warm-300 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-amber-accent/40 focus:border-amber-accent";

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
    <div className="bg-white border border-warm-300 rounded-sm shadow-sm">
      <div className="px-6 py-4 border-b border-warm-200 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold text-warm-950">
            Tarification dynamique
          </h2>
          <p className="text-xs text-warm-500 mt-0.5">
            Prix saisonniers, majorations week-end, promotions
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
            if (selectedDays.length > 0) {
              formData.set("daysOfWeek", selectedDays.join(","));
            }
            await createPricingRule(formData);
            setShowForm(false);
            setSelectedDays([]);
            setPriceType("fixed");
          }}
          className="px-6 py-4 border-b border-warm-200 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-warm-800 mb-1">
                Nom de la règle
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="ex: Haute saison"
                className={inputClass}
              />
            </div>
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
                Période — début (optionnel)
              </label>
              <input type="date" name="validFrom" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-warm-800 mb-1">
                Période — fin (optionnel)
              </label>
              <input type="date" name="validTo" className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-800 mb-2">
              Jours de la semaine (optionnel)
            </label>
            <div className="flex gap-2">
              {DAY_NAMES.map((name, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`w-10 h-10 rounded-sm text-xs font-medium transition-colors ${
                    selectedDays.includes(i)
                      ? "bg-amber-500 text-white"
                      : "bg-warm-100 text-warm-600 hover:bg-warm-200"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <p className="text-xs text-warm-400 mt-1">
              Aucun sélectionné = tous les jours
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-800 mb-2">
              Type de tarification
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-warm-700">
                <input
                  type="radio"
                  checked={priceType === "fixed"}
                  onChange={() => setPriceType("fixed")}
                  className="border-warm-300"
                />
                Prix fixe (€/nuit)
              </label>
              <label className="flex items-center gap-2 text-sm text-warm-700">
                <input
                  type="radio"
                  checked={priceType === "percentage"}
                  onChange={() => setPriceType("percentage")}
                  className="border-warm-300"
                />
                Modificateur (%)
              </label>
            </div>
          </div>

          {priceType === "fixed" ? (
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-warm-800 mb-1">
                Prix fixe (€/nuit)
              </label>
              <input
                type="text"
                name="fixedPrice"
                placeholder="ex: 150"
                className={inputClass}
              />
            </div>
          ) : (
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-warm-800 mb-1">
                Modificateur (%)
              </label>
              <input
                type="text"
                name="percentageModifier"
                placeholder="ex: 30 ou -15"
                className={inputClass}
              />
              <p className="text-xs text-warm-400 mt-1">
                Positif = majoration, négatif = promotion
              </p>
            </div>
          )}

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
          Aucune règle tarifaire configurée
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
                  <span className={rule.active ? "" : "line-through text-warm-400"}>
                    {rule.name}
                  </span>
                  {!rule.active && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 bg-warm-200 text-warm-500 rounded-sm">
                      Désactivée
                    </span>
                  )}
                  <span className="ml-2 text-xs text-warm-500">
                    {rule.roomName ?? "Global"}
                  </span>
                </p>
                <p className="text-xs text-warm-500 space-x-2">
                  {rule.fixedPrice && <span>{parseFloat(rule.fixedPrice).toFixed(0)} €/nuit</span>}
                  {rule.percentageModifier && (
                    <span>
                      {parseFloat(rule.percentageModifier) > 0 ? "+" : ""}
                      {parseFloat(rule.percentageModifier).toFixed(0)}%
                    </span>
                  )}
                  {Array.isArray(rule.daysOfWeek) && (
                    <span>
                      {(rule.daysOfWeek as number[]).map((d) => DAY_NAMES_FR[d]).join(", ")}
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
                  onClick={() => togglePricingRule(rule.id)}
                  className={`text-xs font-medium ${
                    rule.active
                      ? "text-warm-500 hover:text-warm-700"
                      : "text-emerald-600 hover:text-emerald-800"
                  }`}
                >
                  {rule.active ? "Désactiver" : "Activer"}
                </button>
                <button
                  onClick={() => {
                    if (confirm("Supprimer cette règle ?"))
                      deletePricingRule(rule.id);
                  }}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
