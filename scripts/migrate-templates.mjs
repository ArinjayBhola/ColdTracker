import "dotenv/config";
import { readFile } from "node:fs/promises";
import postgres from "postgres";

// Apply only this additive migration without replaying older SQL history.
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
try {
  await sql.begin(async transaction => {
    for (const file of ["0006_message_templates.sql", "0007_template_pins.sql"]) {
      const migration = await readFile(new URL(`../drizzle/${file}`, import.meta.url), "utf8");
      for (const statement of migration.split("--> statement-breakpoint")) {
        if (statement.trim()) await transaction.unsafe(statement);
      }
    }
  });
  await sql`SELECT id, user_id, title, subject, body, category, tags,
    character_limit, favorite, pinned, created_at, updated_at FROM message_templates LIMIT 0`;
  console.log("Templates database migration applied.");
} finally {
  await sql.end();
}
