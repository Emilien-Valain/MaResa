import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),

  emailAndPassword: {
    enabled: true,
  },

  // En dev, tous les *.localhost:<port> sont des origines de confiance
  // Le port est dérivé de BETTER_AUTH_URL pour couvrir aussi le port 3001 des tests
  // Chaque sous-domaine gère sa propre session (miroir du comportement prod)
  ...(process.env.NODE_ENV === "development" && (() => {
    const devUrl = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000");
    const port = devUrl.port ? `:${devUrl.port}` : "";
    return {
      trustedOrigins: [
        devUrl.origin,
        `*.localhost${port}`,
      ],
    };
  })()),

  // Expose tenantId dans l'objet user et session
  user: {
    additionalFields: {
      tenantId: {
        type: "string",
        required: false,
        fieldName: "tenant_id",
      },
    },
  },

  session: {
    additionalFields: {
      tenantId: {
        type: "string",
        required: false,
        fieldName: "tenant_id",
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
