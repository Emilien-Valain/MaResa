@AGENTS.md

# Documentation du projet

Toute la documentation du projet se trouve dans l'Obsidian Vault :
`/home/richard/Documents/Obsidian Vault/SyncGit/Projet Booking Manager/`

Avant d'implémenter une feature, de prendre une décision d'architecture, ou de répondre à une question sur le projet, **consulte d'abord les fichiers Obsidian pertinents** :

- `README.md` — concept général et liens rapides
- `Plan de développement.md` — les 15 tâches en 7 phases, source de vérité du backlog
- `Architecture.md` — choix techniques et justifications
- `Schema DB.md` — schéma Drizzle complet
- `Stack technique.md` — détail de chaque outil
- `iCal Sync.md` — fonctionnement de la synchronisation calendrier
- `Déploiement.md` — Docker, Caddy, SSL, domaines custom
- `Tests de non-régression.md` — cahier de specs des tests E2E

Quand tu modifies le comportement d'une feature documentée dans Obsidian, **mets à jour le fichier correspondant**.

# Tests de non-régression

## Règle : chaque feature doit avoir ses tests

Pour toute nouvelle fonctionnalité ou modification d'une fonctionnalité existante, tu dois :

1. **Écrire ou mettre à jour les tests Playwright** dans `/e2e/` avant de considérer la tâche terminée.
2. **Mettre à jour le fichier de spécifications** dans l'Obsidian Vault : `/home/richard/Documents/Obsidian Vault/SyncGit/Projet Booking Manager/Tests de non-régression.md`. Ce fichier est la source de vérité humaine — maintiens-le synchronisé avec les tests réels.
3. Les tests sont dans `/e2e/`, organisés par domaine : `auth/`, `admin/`, `public/`, `payment/`.
4. Utilise `test.skip(...)` pour les tests dont le code applicatif n'est pas encore écrit. Ne laisse jamais un test sans stub.

## Règle : les tests doivent essayer de casser l'app

Les tests de non-régression ont pour but de garantir que les fonctionnalités **restent viables après chaque push**. Un test qui ne couvre que le "happy path" est insuffisant. Pour chaque feature, tu dois écrire :

### Cas nominaux (happy path)
Le flux principal tel qu'un utilisateur normal l'utilise.

### Cas aux limites (boundary testing)
- **Valeurs extrêmes** : prix = 0, capacité = 1, texte vide, texte à 500 caractères, dates limites (1er jan, 31 déc)
- **Transitions d'état** : cycle complet d'un objet (pending → confirmed → completed, puis annulation depuis chaque état)
- **Paramètres invalides** : UUID inexistant dans l'URL, querystring malformé (?year=abc&month=99), données manquantes

### Cas d'erreur (error paths)
- **Ressource inexistante** : accéder à `/admin/ressource/uuid-qui-nexiste-pas` → doit retourner 404, jamais 500
- **Formulaire invalide** : soumettre sans remplir les champs requis, mauvais format d'email, dates incohérentes (checkout < checkin)
- **Isolation multi-tenant** : un UUID valide mais appartenant à un autre tenant → 404, les données ne fuient pas

### Sécurité de base
- **XSS** : injecter `<script>alert(1)</script>` dans les champs texte → le texte doit apparaître échappé, aucun dialog ne doit se déclencher
- **Accès non authentifié** : toutes les URLs `/admin/*` sans session → redirection vers `/login`, jamais de 500
- **Après déconnexion** : la session est bien détruite, `/admin` redirige vers `/login`

### Règle de nettoyage
Chaque test qui crée des données doit les supprimer à la fin (ou utiliser des données dont d'autres tests dépendent). Les tests doivent pouvoir tourner plusieurs fois de suite sans laisser de résidus en DB.

## Lancer les tests

```bash
npm test          # tous les tests (mode CI)
npm run test:ui   # interface visuelle Playwright
```

Les tests se lancent automatiquement avant chaque commit (hook pre-commit via Husky).

## DB de test

Utilise la variable `TEST_DATABASE_URL` dans `.env.test` pour pointer vers une base PostgreSQL de test dédiée. Ne jamais lancer les tests E2E contre la base de production.

# Esthétique frontend

**UX > UI** — l'app doit d'abord être facile à utiliser et à comprendre. Mais une fois la clarté assurée, pousse le style.

## Principes

- **Typographie** : utilise des fonts distinctives et belles. Évite les fonts génériques (Arial, Inter, Roboto, system fonts). Privilégie des choix qui élèvent l'esthétique.
- **Couleur & thème** : engage-toi sur une esthétique cohérente. Utilise des CSS variables pour la consistance. Des couleurs dominantes avec des accents francs > des palettes timides et uniformément réparties.
- **Motion** : utilise des animations pour les micro-interactions. Priorise les solutions CSS-only. Focus sur les moments à fort impact : une orchestration au chargement de page avec des reveals stagés (animation-delay) > des micro-interactions dispersées.
- **Arrière-plans** : crée de l'atmosphère et de la profondeur plutôt que des couleurs plates. Superpose des gradients CSS, utilise des patterns géométriques, ou ajoute des effets contextuels.

## Interdits (esthétique "AI slop")

- Les fonts clichés (Inter, Roboto, Arial, Space Grotesk)
- Les schémas de couleurs éculés (gradients violets sur fond blanc)
- Les layouts et composants prévisibles et cookie-cutter
- Les choix qui convergent vers le "générique"

## Rappel

Interprète créativement, fais des choix inattendus qui semblent véritablement conçus pour le contexte hôtelier. Varie entre thèmes clairs et sombres, différentes fonts, différentes esthétiques selon le template.
