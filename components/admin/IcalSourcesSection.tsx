"use client";

import { useState, useCallback } from "react";
import { addIcalSource, deleteIcalSource, toggleIcalSource } from "@/lib/actions/ical-sources";

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
      className="text-xs font-medium text-warm-600 hover:text-warm-900 transition-colors"
    >
      {copied ? "Copié !" : "Copier le lien"}
    </button>
  );
}

export default function IcalSourcesSection({
  rooms,
  sources,
}: {
  rooms: Room[];
  sources: IcalSource[];
}) {
  const [showForm, setShowForm] = useState(false);

  // Grouper les sources par chambre — inclure aussi les chambres sans sources
  const grouped = new Map<string, { roomName: string; sources: IcalSource[] }>();

  // Initialiser avec toutes les chambres
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
    <section className="bg-white border border-warm-300 rounded-sm shadow-sm">
      <div className="px-6 py-4 border-b border-warm-200 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold text-warm-950">
            Calendriers externes
          </h2>
          <p className="text-xs text-warm-500 mt-0.5">
            Synchronisez les disponibilités avec Airbnb, Booking.com et autres plateformes via leurs
            liens iCal.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 text-sm font-medium bg-warm-900 text-white rounded-sm hover:bg-warm-800 transition-colors"
        >
          {showForm ? "Annuler" : "Ajouter"}
        </button>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* Formulaire d'ajout */}
        {showForm && (
          <form
            action={async (formData) => {
              await addIcalSource(formData);
              setShowForm(false);
            }}
            className="space-y-3 p-4 bg-warm-50 border border-warm-200 rounded-sm"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="ical-room"
                  className="block text-xs font-medium text-warm-700 mb-1"
                >
                  Chambre
                </label>
                <select
                  id="ical-room"
                  name="roomId"
                  required
                  className="w-full border border-warm-200 rounded-sm px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-accent/40"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="ical-name"
                  className="block text-xs font-medium text-warm-700 mb-1"
                >
                  Nom (ex: Airbnb, Booking)
                </label>
                <input
                  id="ical-name"
                  name="name"
                  type="text"
                  required
                  placeholder="Airbnb"
                  className="w-full border border-warm-200 rounded-sm px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-accent/40"
                />
              </div>
              <div>
                <label
                  htmlFor="ical-url"
                  className="block text-xs font-medium text-warm-700 mb-1"
                >
                  URL iCal
                </label>
                <input
                  id="ical-url"
                  name="url"
                  type="url"
                  required
                  placeholder="https://www.airbnb.com/calendar/ical/..."
                  className="w-full border border-warm-200 rounded-sm px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-accent/40"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium bg-warm-900 text-white rounded-sm hover:bg-warm-800 transition-colors"
              >
                Ajouter le calendrier
              </button>
            </div>
          </form>
        )}

        {/* Liste des sources groupées par chambre */}
        {grouped.size === 0 && !showForm ? (
          <p className="text-sm text-warm-500 text-center py-6">
            Aucun calendrier externe configuré. Ajoutez les liens iCal de vos plateformes pour
            synchroniser automatiquement les disponibilités.
          </p>
        ) : (
          Array.from(grouped.entries()).map(([roomId, { roomName, sources: roomSources }]) => {
            const exportUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/ical/${roomId}`;

            return (
            <div key={roomId} className="space-y-2">
              <h3 className="text-sm font-semibold text-warm-800">{roomName}</h3>

              {/* Lien d'export iCal */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-sm">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-warm-700">
                    Votre calendrier (à coller dans Airbnb / Booking)
                  </p>
                  <p className="text-xs text-warm-500 truncate mt-0.5 font-mono">
                    {exportUrl}
                  </p>
                </div>
                <CopyButton text={exportUrl} />
              </div>

              {/* Sources importées */}
              <div className="space-y-2">
                {roomSources.map((src) => (
                  <div
                    key={src.id}
                    data-testid={`ical-source-${src.id}`}
                    data-source-name={src.name}
                    className="flex items-center justify-between px-4 py-3 bg-warm-50 border border-warm-200 rounded-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${src.active ? "bg-green-500" : "bg-warm-300"}`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-warm-900">{src.name}</p>
                        <p className="text-xs text-warm-400 truncate max-w-xs">{src.url}</p>
                        {src.lastSyncAt && (
                          <p className="text-xs text-warm-400">
                            Dernière sync :{" "}
                            {new Date(src.lastSyncAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <form action={toggleIcalSource}>
                        <input type="hidden" name="sourceId" value={src.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={src.active ? "false" : "true"}
                        />
                        <button
                          type="submit"
                          className="text-xs text-warm-500 hover:text-warm-700 transition-colors"
                        >
                          {src.active ? "Désactiver" : "Activer"}
                        </button>
                      </form>
                      <form
                        action={deleteIcalSource}
                        onSubmit={(e) => {
                          if (!confirm(`Supprimer le calendrier "${src.name}" ?`)) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <input type="hidden" name="sourceId" value={src.id} />
                        <button
                          type="submit"
                          className="text-xs text-red-500 hover:text-red-700 transition-colors"
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
          })
        )}
      </div>
    </section>
  );
}
