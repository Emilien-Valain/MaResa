"use client";

import { useState, useCallback } from "react";
import {
  addIcalSource,
  deleteIcalSource,
  toggleIcalSource,
} from "@/lib/actions/ical-sources";
import {
  AdminInput,
  AdminSelect,
  Field,
  SettingsSection,
} from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";

type Room = { id: string; name: string };

type IcalSource = {
  id: string;
  name: string;
  url: string;
  active: boolean;
  roomId: string;
  roomName: string;
  lastSyncAt: string | null;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      type="button"
      onClick={copy}
      style={{
        padding: "6px 12px",
        background: "var(--admin-surface)",
        color: "var(--admin-primary)",
        border: "1px solid var(--admin-primary)",
        borderRadius: 7,
        fontSize: 12.5,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {copied ? "Copié !" : "Copier le lien"}
    </button>
  );
}

export default function IcalSourcesSection({
  baseUrl,
  rooms,
  sources,
}: {
  baseUrl: string;
  rooms: Room[];
  sources: IcalSource[];
}) {
  const [showForm, setShowForm] = useState(false);

  const grouped = new Map<string, { roomName: string; sources: IcalSource[] }>();
  for (const room of rooms) {
    grouped.set(room.id, { roomName: room.name, sources: [] });
  }
  for (const src of sources) {
    const existing = grouped.get(src.roomId);
    if (existing) {
      existing.sources.push(src);
    } else {
      grouped.set(src.roomId, { roomName: src.roomName, sources: [src] });
    }
  }

  return (
    <SettingsSection
      title="Calendriers externes"
      desc="Synchronise les disponibilités avec Airbnb, Booking.com et autres plateformes via leurs liens iCal."
      action={
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: "7px 14px",
            background: showForm ? "transparent" : "var(--admin-primary)",
            color: showForm ? "var(--admin-text-muted)" : "#fff",
            border: showForm
              ? "1px solid var(--admin-border)"
              : "none",
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
            await addIcalSource(formData);
            setShowForm(false);
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
              <AdminSelect id="ical-room" name="roomId" required>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </AdminSelect>
            </Field>
            <Field label="Nom">
              <AdminInput
                id="ical-name"
                name="name"
                type="text"
                required
                placeholder="Airbnb"
              />
            </Field>
            <Field label="URL iCal">
              <AdminInput
                id="ical-url"
                name="url"
                type="url"
                required
                placeholder="https://www.airbnb.com/calendar/ical/..."
              />
            </Field>
          </div>
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
              Ajouter le calendrier
            </button>
          </div>
        </form>
      )}

      {grouped.size === 0 && !showForm ? (
        <p
          className="text-center py-6 text-[13px]"
          style={{ color: "var(--admin-text-muted)" }}
        >
          Aucun calendrier externe configuré. Ajoute les liens iCal de tes
          plateformes pour synchroniser automatiquement les disponibilités.
        </p>
      ) : (
        <div className="space-y-5">
          {Array.from(grouped.entries()).map(
            ([roomId, { roomName, sources: roomSources }]) => {
              const exportUrl = `${baseUrl}/api/ical/${roomId}`;
              return (
                <div key={roomId}>
                  <h3
                    className="text-[13px] font-bold mb-2"
                    style={{ color: "var(--admin-text)" }}
                  >
                    {roomName}
                  </h3>

                  <div
                    className="flex items-center gap-3 mb-2"
                    style={{
                      padding: "10px 14px",
                      background: "var(--admin-primary-light)",
                      borderRadius: 8,
                    }}
                  >
                    <Icon.Calendar
                      size={18}
                      style={{ color: "var(--admin-primary)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[12.5px] font-bold"
                        style={{ color: "var(--admin-text)" }}
                      >
                        Lien d&apos;export (à coller dans Airbnb / Booking)
                      </p>
                      <p
                        className="font-mono text-[11.5px] mt-0.5 truncate"
                        style={{ color: "var(--admin-text-muted)" }}
                      >
                        {exportUrl}
                      </p>
                    </div>
                    <CopyButton text={exportUrl} />
                  </div>

                  <div className="space-y-2">
                    {roomSources.map((src) => (
                      <div
                        key={src.id}
                        data-testid={`ical-source-${src.id}`}
                        data-source-name={src.name}
                        className="flex items-center justify-between"
                        style={{
                          padding: "12px 14px",
                          background: "var(--admin-surface-2)",
                          border: "1px solid var(--admin-border-light)",
                          borderRadius: 8,
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="rounded-full flex-shrink-0"
                            style={{
                              width: 8,
                              height: 8,
                              background: src.active
                                ? "#16A34A"
                                : "var(--admin-border)",
                            }}
                          />
                          <div className="min-w-0">
                            <p
                              className="text-[13.5px] font-semibold"
                              style={{ color: "var(--admin-text)" }}
                            >
                              {src.name}
                            </p>
                            <p
                              className="text-[11.5px] font-mono truncate"
                              style={{
                                color: "var(--admin-text-subtle)",
                                maxWidth: 360,
                              }}
                            >
                              {src.url}
                            </p>
                            {src.lastSyncAt && (
                              <p
                                className="text-[11.5px] mt-0.5"
                                style={{ color: "var(--admin-text-subtle)" }}
                              >
                                Dernière sync :{" "}
                                {new Date(src.lastSyncAt).toLocaleDateString(
                                  "fr-FR",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <form action={toggleIcalSource}>
                            <input
                              type="hidden"
                              name="sourceId"
                              value={src.id}
                            />
                            <input
                              type="hidden"
                              name="active"
                              value={src.active ? "false" : "true"}
                            />
                            <button
                              type="submit"
                              className="text-[12px] font-semibold transition-colors"
                              style={{
                                color: "var(--admin-text-muted)",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              {src.active ? "Désactiver" : "Activer"}
                            </button>
                          </form>
                          <form
                            action={deleteIcalSource}
                            onSubmit={(e) => {
                              if (
                                !confirm(
                                  `Supprimer le calendrier "${src.name}" ?`,
                                )
                              ) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <input
                              type="hidden"
                              name="sourceId"
                              value={src.id}
                            />
                            <button
                              type="submit"
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
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            },
          )}
        </div>
      )}
    </SettingsSection>
  );
}
