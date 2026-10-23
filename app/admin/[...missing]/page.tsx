import { notFound } from "next/navigation";

// Toute URL /admin/* inconnue affiche le 404 de l'admin (avec la navigation), pas celui du site.
export default function AdminCatchAll() {
  notFound();
}
