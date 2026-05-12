"use client";

import { useState } from "react";
import { updateEmailSettings } from "@/lib/actions/email-settings";
import {
  AdminInput,
  AdminTextarea,
  Field,
  SettingsSection,
  StatusBanner,
} from "@/components/admin/ui";

type EmailSettingsSectionProps = {
  confirmationMessage?: string;
  postStayMessage?: string;
  reviewUrl?: string;
};

export default function EmailSettingsSection({
  confirmationMessage,
  postStayMessage,
  reviewUrl,
}: EmailSettingsSectionProps) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <SettingsSection
      title="Emails"
      desc="Personnalise les messages envoyés aux clients par email."
    >
      {saved && (
        <StatusBanner variant="success">
          Paramètres email mis à jour avec succès.
        </StatusBanner>
      )}
      {error && <StatusBanner variant="error">{error}</StatusBanner>}

      <form
        action={async (formData) => {
          setSaved(false);
          setError(null);
          try {
            await updateEmailSettings(formData);
            setSaved(true);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Erreur lors de la sauvegarde",
            );
          }
        }}
      >
        <Field
          label="Message de confirmation de réservation"
          hint="Apparaît dans l'email de confirmation envoyé au client après paiement."
        >
          <AdminTextarea
            id="email-confirmation"
            name="confirmationMessage"
            rows={3}
            defaultValue={confirmationMessage ?? ""}
            placeholder="Ex: Nous avons hâte de vous accueillir ! N'hésitez pas à nous contacter pour toute demande spéciale."
          />
        </Field>

        <Field
          label="Message post-séjour"
          hint="Envoyé automatiquement le lendemain du départ."
        >
          <AdminTextarea
            id="email-poststay"
            name="postStayMessage"
            rows={3}
            defaultValue={postStayMessage ?? ""}
            placeholder="Ex: Merci pour votre séjour ! Nous espérons vous revoir bientôt."
          />
        </Field>

        <Field
          label="Lien Google Reviews"
          hint="Un bouton « Laisser un avis » sera ajouté à l'email post-séjour."
        >
          <AdminInput
            id="email-review-url"
            name="reviewUrl"
            type="url"
            defaultValue={reviewUrl ?? ""}
            placeholder="https://g.page/r/votre-etablissement/review"
          />
        </Field>

        <div className="flex justify-end mt-4">
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
            Enregistrer
          </button>
        </div>
      </form>
    </SettingsSection>
  );
}
