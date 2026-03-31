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

## Lancer les tests

```bash
npm test          # tous les tests (mode CI)
npm run test:ui   # interface visuelle Playwright
```

Les tests se lancent automatiquement avant chaque commit (hook pre-commit via Husky).

## DB de test

Utilise la variable `TEST_DATABASE_URL` dans `.env.test` pour pointer vers une base PostgreSQL de test dédiée. Ne jamais lancer les tests E2E contre la base de production.
