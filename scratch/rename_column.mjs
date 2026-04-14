import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config();

async function renameColumn() {
    const sql = postgres(process.env.DATABASE_URL);
    try {
        console.log("Casting column \"user_id\" to uuid in extension_leads...");
        await sql`ALTER TABLE extension_leads ALTER COLUMN user_id TYPE uuid USING user_id::uuid`;
        console.log("Success!");
    } catch (err) {
        console.log("Rename failed (it might already be renamed):", err.message);
    } finally {
        await sql.end();
    }
}

renameColumn();
