const postgres = require("postgres");

const url = process.env.VETMED_DATABASE_URL;
if (!url) throw new Error("VETMED_DATABASE_URL yok.");

const sql = postgres(url, {
  max: 1,
  prepare: false,
  connect_timeout: 15
});

(async () => {
  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "public"."case_knowledge_records" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clinic_id" uuid NOT NULL,
        "case_id" uuid NOT NULL,
        "diagnosis_name" text NOT NULL,
        "species" text NOT NULL,
        "feature_snapshot" jsonb NOT NULL,
        "source_type" text NOT NULL DEFAULT 'CLINICAL_CASE',
        "review_status" text NOT NULL DEFAULT 'PENDING',
        "reviewed_by_user_id" uuid,
        "reviewed_at" timestamp(3),
        "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "case_knowledge_records_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "case_knowledge_records_clinic_id_fkey"
          FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id")
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "case_knowledge_records_case_id_fkey"
          FOREIGN KEY ("case_id") REFERENCES "public"."clinical_cases"("id")
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "case_knowledge_records_reviewed_by_user_id_fkey"
          FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id")
          ON DELETE SET NULL ON UPDATE CASCADE
      );

      CREATE INDEX IF NOT EXISTS "case_knowledge_records_clinic_id_review_status_idx"
        ON "public"."case_knowledge_records"("clinic_id", "review_status");

      CREATE INDEX IF NOT EXISTS "case_knowledge_records_clinic_id_diagnosis_name_idx"
        ON "public"."case_knowledge_records"("clinic_id", "diagnosis_name");

      CREATE INDEX IF NOT EXISTS "case_knowledge_records_case_id_idx"
        ON "public"."case_knowledge_records"("case_id");
    `);

    const rows = await sql.unsafe(`
      SELECT to_regclass('public.case_knowledge_records') AS table_name
    `);

    if (!rows[0] || rows[0].table_name !== "case_knowledge_records") {
      throw new Error("Tablo olusturuldu olarak dogrulanamadi.");
    }

    console.log("OK: public.case_knowledge_records mevcut.");
  } finally {
    await sql.end({ timeout: 5 });
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});