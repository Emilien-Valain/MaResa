-- Dédoublonnage avant l'index unique : les doublons (tenant, slug) suivants et les slugs vides reçoivent -<6 premiers caractères de l'id>
UPDATE "rooms" r SET "slug" = (CASE WHEN r."slug" = '' THEN 'chambre' ELSE r."slug" END) || '-' || left(r."id"::text, 6)
FROM (SELECT "id", row_number() OVER (PARTITION BY "tenant_id", "slug" ORDER BY "created_at", "id") AS rn FROM "rooms") d
WHERE d."id" = r."id" AND (d.rn > 1 OR r."slug" = '');--> statement-breakpoint
DROP INDEX "rooms_slug_tenant_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "rooms_slug_tenant_idx" ON "rooms" USING btree ("tenant_id","slug");
