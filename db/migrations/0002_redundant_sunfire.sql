CREATE TABLE "user_tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_tenants_user_tenant_unique" UNIQUE("user_id","tenant_id")
);
--> statement-breakpoint
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_tenants_user_idx" ON "user_tenants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_tenants_tenant_idx" ON "user_tenants" USING btree ("tenant_id");