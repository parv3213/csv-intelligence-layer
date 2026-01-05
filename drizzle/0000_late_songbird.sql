CREATE TABLE "decision_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingestion_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"decision_type" text NOT NULL,
	"details" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schema_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"raw_file_key" text NOT NULL,
	"original_filename" text,
	"output_file_key" text,
	"inferred_schema" jsonb,
	"mapping_result" jsonb,
	"validation_result" jsonb,
	"row_count" integer,
	"valid_row_count" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mapping_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schema_id" uuid NOT NULL,
	"source_fingerprint" text NOT NULL,
	"mappings" jsonb NOT NULL,
	"usage_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mapping_templates_schema_id_source_fingerprint_unique" UNIQUE("schema_id","source_fingerprint")
);
--> statement-breakpoint
CREATE TABLE "schemas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"description" text,
	"definition" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "decision_logs" ADD CONSTRAINT "decision_logs_ingestion_id_ingestions_id_fk" FOREIGN KEY ("ingestion_id") REFERENCES "public"."ingestions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestions" ADD CONSTRAINT "ingestions_schema_id_schemas_id_fk" FOREIGN KEY ("schema_id") REFERENCES "public"."schemas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mapping_templates" ADD CONSTRAINT "mapping_templates_schema_id_schemas_id_fk" FOREIGN KEY ("schema_id") REFERENCES "public"."schemas"("id") ON DELETE no action ON UPDATE no action;