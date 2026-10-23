"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  // Onglet dans l'URL (?tab=) : partageable et conservé au rechargement, comme Paramètres.
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") as Tab | null;
  const [tab, setTabState] = useState<Tab>(
    urlTab && TABS.some((t) => t.id === urlTab) ? urlTab : "booking",
  );
  const setTab = (next: Tab) => {
    setTabState(next);
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <>
      <Tabs<Tab> tabs={TABS} active={tab} onChange={setTab} label="Types de règles" />

      <div
        className="max-w-[760px]"
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
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
