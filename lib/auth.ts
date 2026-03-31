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
