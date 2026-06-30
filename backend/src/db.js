import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5432", 10),
  database: process.env.PGDATABASE || "stock_monitor",
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

pool.on("error", (err) => {
  console.error("Unexpected Postgres pool error:", err);
});
