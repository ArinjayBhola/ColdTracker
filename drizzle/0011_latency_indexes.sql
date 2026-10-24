CREATE INDEX IF NOT EXISTS "user_email_idx" ON "user" ("email");
CREATE INDEX IF NOT EXISTS "outreach_user_id_company_idx" ON "outreach" ("userId", "company_name");
CREATE INDEX IF NOT EXISTS "extension_leads_user_id_created_at_idx" ON "extension_leads" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "goals_user_id_idx" ON "goals" ("user_id");
