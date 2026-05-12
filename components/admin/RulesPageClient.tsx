"use client";

import { useState } from "react";
import { Tabs } from "@/components/admin/ui";
import ManualBlockSection from "./ManualBlockSection";
import BookingRuleSection from "./BookingRuleSection";
import PricingRuleSection from "./PricingRuleSection";

type Tab = "booking" | "pricing" | "blocks";

const TABS: { id: Tab; label: string }[] = [
  { id: "booking", label: "Règles de réservation" },
  { id: "pricing", label: "Tarification" },
  { id: "blocks", label: "Blocages manuels" },
];

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
  const [tab, setTab] = useState<Tab>("booking");

  return (
    <>
      <Tabs<Tab> tabs={TABS} active={tab} onChange={setTab} />

      <div className="max-w-[760px]">
        {tab === "booking" && (
          <BookingRuleSection rooms={rooms} rules={bookingRules} />
        )}
        {tab === "pricing" && (
          <PricingRuleSection rooms={rooms} rules={pricingRules} />
        )}
        {tab === "blocks" && (
          <ManualBlockSection rooms={rooms} blocks={manualBlocks} />
        )}
      </div>
    </>
  );
}
