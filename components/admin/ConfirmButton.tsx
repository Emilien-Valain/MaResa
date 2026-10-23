"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * Bouton qui ouvre une confirmation stylée (<dialog> natif : focus piégé, Échap,
 * fond modal) avant une action destructive. Remplace window.confirm(), qui ne dit
 * pas ce qui va se passer et s'affiche dans la langue du navigateur.
 */
export function ConfirmButton({
  children,
  title,
  message,
  confirmLabel,
  cancelLabel = "Retour",
  onConfirm,
  className,
  style,
}: {
  children: ReactNode;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => unknown | Promise<unknown>;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Contenu monté seulement quand le dialog est ouvert : pas de texte caché dans le DOM.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) ref.current?.showModal();
  }, [open]);

  function confirm() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await onConfirm();
        // Une action peut refuser proprement en renvoyant { error } : on garde le dialog ouvert.
        if (
          result &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
        ) {
          setError(result.error);
          return;
        }
        ref.current?.close();
      } catch (e) {
        // redirect()/notFound() d'une server action remontent comme exceptions : on les laisse passer.
        if (e && typeof e === "object" && "digest" in e) throw e;
        setError("L'action n'a pas pu aboutir. Réessayez dans un instant.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className={className}
        style={style}
      >
        {children}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className="admin-dialog"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // Clic sur le fond (hors de la carte) = Retour
          if (e.target === e.currentTarget && !pending) ref.current?.close();
        }}
      >
        {open && (
          <div className="p-6">
            <h2
              id={titleId}
              className="text-[15px] font-extrabold"
              style={{ color: "var(--admin-text)", letterSpacing: "-0.3px" }}
            >
              {title}
            </h2>
            <div
              className="text-[13.5px] leading-[1.55] mt-2"
              style={{ color: "var(--admin-text-muted)" }}
            >
              {message}
            </div>
            {error && (
              <p
                role="alert"
                className="text-[12.5px] font-semibold mt-3"
                style={{ color: "#B91C1C" }}
              >
                {error}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2 mt-6">
              <button
                type="button"
                autoFocus
                disabled={pending}
                onClick={() => ref.current?.close()}
                className="admin-btn admin-btn--ghost"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                data-confirm
                disabled={pending}
                onClick={confirm}
                className="admin-btn admin-btn--danger"
              >
                {pending ? "En cours…" : confirmLabel}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
