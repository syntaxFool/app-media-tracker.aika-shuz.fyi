-- Add AppConfig table for database-backed settings
CREATE TABLE IF NOT EXISTS "app_config" (
    "key"        TEXT        NOT NULL,
    "value"      JSONB       NOT NULL,
    "updated_by" TEXT        NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("key")
);
