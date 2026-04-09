import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/db/schema";
import { sendPasswordResetEmail } from "@/lib/email";
import type { TenantConfig } from "@/lib/tenant-context";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),

  emailAndPassword: {
    enabled: true,
    async sendResetPassword({ user, url }) {
      // Résoudre le tenant de l'admin pour brander l'email
      let hotelName: string | undefined;
      let config: TenantConfig | undefined;

      const membership = await db.query.userTenants.findFirst({
        where: eq(schema.userTenants.userId, user.id),
      });

      if (membership) {
        const [tenant] = await db
          .select({ name: schema.tenants.name, config: schema.tenants.config })
          .from(schema.tenants)
          .where(eq(schema.tenants.id, membership.tenantId))
          .limit(1);

        if (tenant) {
          hotelName = tenant.name;
          config = (tenant.config ?? {}) as TenantConfig;
        }
      }

      await sendPasswordResetEmail({
        userName: user.name,
        userEmail: user.email,
        resetUrl: url,
        hotelName,
        config,
      });
    },
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
