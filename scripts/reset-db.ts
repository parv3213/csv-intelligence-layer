import "dotenv/config";
import pg from "pg";

async function resetDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new pg.Pool({ connectionString });

  try {
    console.log("Dropping public schema...");
    await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
    await pool.query("CREATE SCHEMA public");
    await pool.query("GRANT ALL ON SCHEMA public TO public");
    // If you are using a specific user, you might need:
    // await pool.query(`GRANT ALL ON SCHEMA public TO ${process.env.DB_USER || 'postgres'}`);
    console.log("Public schema recreated successfully.");
  } catch (error) {
    console.error("Error resetting database:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetDb();
