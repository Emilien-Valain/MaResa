"use client";

import { useState } from "react";
import { updateContent } from "@/lib/actions/content";
import {
  AdminInput,
  AdminTextarea,
  Field,
  SettingsSection,
  StatusBanner,
} from "@/components/admin/ui";
import HeroPhotoUploader from "@/components/admin/HeroPhotoUploader";
import type { TenantConfig, StoryStat } from "@/lib/tenant-context";

const MAX_STATS = 4;

function emptyStat(): StoryStat {
  return { value: "", label: "" };
}

export default function ContentSection({ config }: { config: TenantConfig }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialStats: StoryStat[] =
    config.storyStats && config.storyStats.length > 0
      ? config.storyStats.slice(0, MAX_STATS)
      : [];

  const [stats, setStats] = useState<StoryStat[]>(initialStats);

  const updateStat = (i: number, field: keyof StoryStat, val: string) => {
    setStats((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)));
  };

  const addStat = () => {
    if (stats.length < MAX_STATS) setStats([...stats, emptyStat()]);
  };

  const removeStat = (i: number) => {
    setStats((prev) => prev.filter((_, idx) => idx !== i));
  };

  return (
    <>
      {saved && (
        <StatusBanner variant="success">Contenu mis à jour avec succès.</StatusBanner>
      )}
      {error && <StatusBanner variant="error">{error}</StatusBanner>}

      <form
        action={async (formData) => {
          setSaved(false);
          setError(null);
          // Filtre les stats vides avant envoi
          const cleanStats = stats
            .map((s) => ({ value: s.value.trim(), label: s.label.trim() }))
            .filter((s) => s.value && s.label);
          formData.set("storyStats", JSON.stringify(cleanStats));
          try {
            await updateContent(formData);
            setSaved(true);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur lors de la sauvegarde");
          }
        }}
      >
        <SettingsSection
          title="Hero — Image de fond"
          desc="L'image visible en première page. Si absente, un fond uni colorée est utilisée."
        >
          <HeroPhotoUploader initialPhoto={config.heroPhoto} />
        </SettingsSection>

        <SettingsSection
          title="Hero — Textes"
          desc="Le pavé visible en première page. Vide = on n'affiche pas la ligne."
        >
          <Field label="Petit titre (eyebrow)" hint="Mention au-dessus du grand titre — ex. « Boutique hôtel »">
            <AdminInput
              name="heroEyebrow"
              defaultValue={config.heroEyebrow ?? ""}
              placeholder="Boutique hôtel · Lyon"
              maxLength={120}
            />
          </Field>

          <Field label="Titre principal">
            <AdminInput
              name="heroTitle"
              defaultValue={config.heroTitle ?? ""}
              placeholder="Le luxe discret au cœur de Lyon"
              maxLength={200}
            />
          </Field>

          <Field label="Sous-titre">
            <AdminTextarea
              name="heroSubtitle"
              defaultValue={config.heroSubtitle ?? ""}
              rows={2}
              placeholder="12 chambres. Un restaurant étoilé. Un spa pensé pour la déconnexion totale."
              maxLength={500}
            />
          </Field>
        </SettingsSection>

        <SettingsSection
          title="Notre histoire"
          desc="Bloc affiché sous le hero. Laisse vide pour ne pas l'afficher."
        >
          <Field label="Eyebrow">
            <AdminInput
              name="storyEyebrow"
              defaultValue={config.storyEyebrow ?? ""}
              placeholder="Notre histoire"
              maxLength={120}
            />
          </Field>
          <Field label="Titre">
            <AdminInput
              name="storyTitle"
              defaultValue={config.storyTitle ?? ""}
              placeholder="Un hôtel particulier du XIXe siècle"
              maxLength={200}
            />
          </Field>
          <Field label="Description">
            <AdminTextarea
              name="storyText"
              defaultValue={config.storyText ?? ""}
              rows={5}
              placeholder="Ancienne demeure d'un soyeux lyonnais…"
              maxLength={2000}
            />
          </Field>
        </SettingsSection>

        <SettingsSection
          title="Chiffres clés"
          desc={`Jusqu'à ${MAX_STATS} cartes affichées à côté de l'histoire (ex. 12 chambres, 1 restaurant étoilé).`}
        >
          <div className="space-y-2.5">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_2fr_auto] gap-2 items-end"
              >
                <Field label={i === 0 ? "Valeur" : ""}>
                  <AdminInput
                    value={stat.value}
                    onChange={(e) => updateStat(i, "value", e.target.value)}
                    placeholder="12"
                    maxLength={20}
                    aria-label={`Valeur du chiffre ${i + 1}`}
                  />
                </Field>
                <Field label={i === 0 ? "Libellé" : ""}>
                  <AdminInput
                    value={stat.label}
                    onChange={(e) => updateStat(i, "label", e.target.value)}
                    placeholder="Chambres"
                    maxLength={60}
                    aria-label={`Libellé du chiffre ${i + 1}`}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => removeStat(i)}
                  className="mb-[2px]"
                  style={{
                    padding: "8px 14px",
                    background: "transparent",
                    color: "var(--admin-text-muted)",
                    border: "1px solid var(--admin-border)",
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                  aria-label={`Supprimer le chiffre ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}

            {stats.length < MAX_STATS && (
              <button
                type="button"
                onClick={addStat}
                style={{
                  padding: "8px 14px",
                  background: "transparent",
                  color: "var(--admin-primary)",
                  border: "1px dashed var(--admin-primary)",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Ajouter un chiffre
              </button>
            )}
          </div>
        </SettingsSection>

        <SettingsSection
          title="Footer"
          desc="Note discrète affichée en pied de page (slogan, signature…)."
        >
          <Field label="Tagline">
            <AdminInput
              name="footerTagline"
              defaultValue={config.footerTagline ?? ""}
              placeholder="L'art de recevoir, depuis 1921."
              maxLength={200}
            />
          </Field>
        </SettingsSection>

        <div className="flex justify-end mt-4">
          <button
            type="submit"
            style={{
              padding: "10px 20px",
              background: "var(--admin-primary)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Enregistrer
          </button>
        </div>
      </form>
    </>
  );
}
