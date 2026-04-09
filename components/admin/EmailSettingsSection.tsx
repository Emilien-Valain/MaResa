"use client";

import { useState } from "react";
import { updateEmailSettings } from "@/lib/actions/email-settings";

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
    <section className="bg-white border border-warm-300 rounded-sm shadow-sm">
      <div className="px-6 py-4 border-b border-warm-200">
        <h2 className="font-heading text-lg font-semibold text-warm-950">
          Emails
        </h2>
        <p className="text-xs text-warm-500 mt-0.5">
          Personnalisez les messages envoy&eacute;s &agrave; vos clients par email.
        </p>
      </div>

      <div className="px-6 py-5">
        {saved && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-sm text-sm text-green-800">
            Param&egrave;tres email mis &agrave; jour avec succ&egrave;s.
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-sm text-sm text-red-800">
            {error}
          </div>
        )}

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
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="email-confirmation"
              className="block text-xs font-medium text-warm-700 mb-1"
            >
              Message de confirmation de r&eacute;servation
            </label>
            <textarea
              id="email-confirmation"
              name="confirmationMessage"
              rows={3}
              defaultValue={confirmationMessage ?? ""}
              placeholder="Ex: Nous avons h&acirc;te de vous accueillir ! N'h&eacute;sitez pas &agrave; nous contacter pour toute demande sp&eacute;ciale."
              className="w-full border border-warm-200 rounded-sm px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-accent/40 resize-y"
            />
            <p className="text-xs text-warm-400 mt-1">
              Ce message appara&icirc;tra dans l&apos;email de confirmation envoy&eacute; au client apr&egrave;s paiement.
            </p>
          </div>

          <div>
            <label
              htmlFor="email-poststay"
              className="block text-xs font-medium text-warm-700 mb-1"
            >
              Message post-s&eacute;jour
            </label>
            <textarea
              id="email-poststay"
              name="postStayMessage"
              rows={3}
              defaultValue={postStayMessage ?? ""}
              placeholder="Ex: Merci pour votre s&eacute;jour ! Nous esp&eacute;rons vous revoir bient&ocirc;t."
              className="w-full border border-warm-200 rounded-sm px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-accent/40 resize-y"
            />
            <p className="text-xs text-warm-400 mt-1">
              Ce message sera envoy&eacute; automatiquement le lendemain du d&eacute;part de vos clients.
            </p>
          </div>

          <div>
            <label
              htmlFor="email-review-url"
              className="block text-xs font-medium text-warm-700 mb-1"
            >
              Lien pour laisser un avis (Google Reviews)
            </label>
            <input
              id="email-review-url"
              name="reviewUrl"
              type="url"
              defaultValue={reviewUrl ?? ""}
              placeholder="https://g.page/r/votre-etablissement/review"
              className="w-full border border-warm-200 rounded-sm px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-accent/40"
            />
            <p className="text-xs text-warm-400 mt-1">
              Un bouton &laquo; Laisser un avis &raquo; sera ajout&eacute; &agrave; l&apos;email post-s&eacute;jour.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-warm-900 text-white rounded-sm hover:bg-warm-800 transition-colors"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
