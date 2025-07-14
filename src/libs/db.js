// filepath: src/libs/db.js
import { Pool } from "pg"

// Update these values to match your local PostgreSQL setup
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "water_meter_app",
  password: "Muthoni_Wagura123",
  port: 5432, // default PostgreSQL port
})

export default pool