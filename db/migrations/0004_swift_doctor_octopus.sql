CREATE TABLE "booking_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"room_id" uuid,
	"valid_from" timestamp,
	"valid_to" timestamp,
	"min_stay" integer,
	"max_stay" integer,
	"allowed_check_in_days" jsonb,
	"allowed_check_out_days" jsonb,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "manual_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"room_id" uuid,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"recurring" boolean DEFAULT false NOT NULL,
	"recurrence_type" text,
	"recurrence_days" jsonb DEFAULT '[]'::jsonb,
	"recurrence_until" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"room_id" uuid,
	"name" text NOT NULL,
	"valid_from" timestamp,
	"valid_to" timestamp,
	"days_of_week" jsonb,
	"fixed_price" numeric(10, 2),
	"percentage_modifier" numeric(6, 2),
	"priority" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "booking_rules" ADD CONSTRAINT "booking_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_rules" ADD CONSTRAINT "booking_rules_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_blocks" ADD CONSTRAINT "manual_blocks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_blocks" ADD CONSTRAINT "manual_blocks_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_rules_tenant_room_idx" ON "booking_rules" USING btree ("tenant_id","room_id");--> statement-breakpoint
CREATE INDEX "booking_rules_validity_idx" ON "booking_rules" USING btree ("valid_from","valid_to");--> statement-breakpoint
CREATE INDEX "manual_blocks_tenant_room_idx" ON "manual_blocks" USING btree ("tenant_id","room_id");--> statement-breakpoint
CREATE INDEX "manual_blocks_dates_idx" ON "manual_blocks" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "pricing_rules_tenant_room_idx" ON "pricing_rules" USING btree ("tenant_id","room_id");--> statement-breakpoint
CREATE INDEX "pricing_rules_validity_idx" ON "pricing_rules" USING btree ("valid_from","valid_to");