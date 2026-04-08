"use client";

import { useState } from "react";
import ManualBlockSection from "./ManualBlockSection";
import BookingRuleSection from "./BookingRuleSection";
import PricingRuleSection from "./PricingRuleSection";

const TABS = [
  { id: "blocks", label: "Blocages" },
  { id: "rules", label: "Règles de séjour" },
  { id: "pricing", label: "Tarification" },
] as const;

type Tab = (typeof TABS)[number]["id"];

interface Props {
  rooms: { id: string; name: string }[];
  manualBlocks: ManualBlockRow[];
  bookingRules: BookingRuleRow[];
  pricingRules: PricingRuleRow[];
}

export interface ManualBlockRow {
  id: string;
  roomId: string | null;
  roomName: string | null;
  startDate: string;
  endDate: string;
  recurring: boolean;
  recurrenceType: string | null;
  recurrenceDays: unknown;
  recurrenceUntil: string | null;
  createdAt: string | null;
}

export interface BookingRuleRow {
  id: string;
  roomId: string | null;
  roomName: string | null;
  validFrom: string | null;
  validTo: string | null;
  minStay: number | null;
  maxStay: number | null;
  allowedCheckInDays: unknown;
  allowedCheckOutDays: unknown;
  priority: number;
  createdAt: string | null;
}

export interface PricingRuleRow {
  id: string;
  roomId: string | null;
  roomName: string | null;
  name: string;
  validFrom: string | null;
  validTo: string | null;
  daysOfWeek: unknown;
  fixedPrice: string | null;
  percentageModifier: string | null;
  priority: number;
  active: boolean;
  createdAt: string | null;
}

export default function RulesPageClient({
  rooms,
  manualBlocks,
  bookingRules,
  pricingRules,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("blocks");

  return (
    <div className="space-y-6">
      {/* Onglets */}
      <div className="flex gap-1 bg-warm-200 p-1 rounded-sm">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-sm transition-colors ${
              activeTab === tab.id
                ? "bg-white text-warm-900 shadow-sm"
                : "text-warm-600 hover:text-warm-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {activeTab === "blocks" && (
        <ManualBlockSection rooms={rooms} blocks={manualBlocks} />
      )}
      {activeTab === "rules" && (
        <BookingRuleSection rooms={rooms} rules={bookingRules} />
      )}
      {activeTab === "pricing" && (
        <PricingRuleSection rooms={rooms} rules={pricingRules} />
      )}
    </div>
  );
}
