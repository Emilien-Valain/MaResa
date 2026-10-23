import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// drizzle-kit ne lit pas .env.local tout seul (Next le fait, pas lui).
config({ path: ".env.local" });

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
