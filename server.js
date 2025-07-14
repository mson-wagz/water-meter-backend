// server.js
import express from "express"
import cors from "cors"
import pool from "./src/libs/db.js"
import bcrypt from "bcrypt"
import dotenv from "dotenv"
dotenv.config()  // 👈 Tell dotenv to load from .env.local




const app = express()
app.use(cors())
app.use(express.json())

// eslint-disable-next-line no-undef
const PORT = process.env.PORT || 3001


app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // eslint-disable-next-line no-undef
  if (email !== process.env.ADMIN_EMAIL) {
    return res.status(401).json({ error: "Invalid email" });
  }

  // eslint-disable-next-line no-undef
  const valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  if (!valid) {
    return res.status(401).json({ error: "Invalid password" });
  }

  res.status(200).json({ message: "Login successful" });
});

// Get all meter readings
app.get("/api/readings", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM meter_readings ORDER BY reading_date DESC")
    res.json(result.rows)
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch readings" })
  }
})

// Add a new meter reading
app.post("/api/readings", async (req, res) => {
  try {
    const {
      unitNumber,
      previousReading,
      currentReading,
      pricePerUnit,
      readingDate,
      dueDate,
    } = req.body

    const unitsConsumed = Math.max(0, currentReading - previousReading)
    const totalAmount = unitsConsumed * pricePerUnit

    const insertQuery = `
      INSERT INTO meter_readings
        (unit_number, previous_reading, current_reading, units_consumed, price_per_unit, total_amount, reading_date, due_date, payment_status, paid_amount)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, 'unpaid', 0)
      RETURNING *
    `
    const values = [
      unitNumber,
      previousReading,
      currentReading,
      unitsConsumed,
      pricePerUnit,
      totalAmount,
      readingDate,
      dueDate,
    ]
    const result = await pool.query(insertQuery, values)
    res.json(result.rows[0])
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    res.status(500).json({ error: "Failed to add reading" })
  }
})

// Edit a meter reading
app.put("/api/readings/:id", async (req, res) => {
  try {
    const { id } = req.params
    const {
      unitNumber,
      previousReading,
      currentReading,
      pricePerUnit,
      readingDate,
      dueDate,
    } = req.body

    const unitsConsumed = Math.max(0, currentReading - previousReading)
    const totalAmount = unitsConsumed * pricePerUnit

    const updateQuery = `
      UPDATE meter_readings
      SET unit_number = $1,
          previous_reading = $2,
          current_reading = $3,
          units_consumed = $4,
          price_per_unit = $5,
          total_amount = $6,
          reading_date = $7,
          due_date = $8
      WHERE id = $9
      RETURNING *
    `
    const values = [
      unitNumber,
      previousReading,
      currentReading,
      unitsConsumed,
      pricePerUnit,
      totalAmount,
      readingDate,
      dueDate,
      id,
    ]
    const result = await pool.query(updateQuery, values)
    res.json(result.rows[0])
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    res.status(500).json({ error: "Failed to update reading" })
  }
})

// Delete a meter reading
app.delete("/api/readings/:id", async (req, res) => {
  try {
    const { id } = req.params
    await pool.query("DELETE FROM meter_readings WHERE id = $1", [id])
    res.json({ success: true })
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    res.status(500).json({ error: "Failed to delete reading" })
  }
})

// Add a payment
app.post("/api/payments", async (req, res) => {
  try {
    console.log("Received:", req.body)
    const { meterReadingId, amount, paymentDate, method, notes } = req.body
    const insertPayment = `
      INSERT INTO payment_records
        (meter_reading_id, amount, payment_date, payment_method, notes)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING *
    `
    const values = [meterReadingId, amount, paymentDate, method, notes]
    const result = await pool.query(insertPayment, values)
    res.json(result.rows[0])
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    res.status(500).json({ error: "Failed to add payment" })
  }
})

//Update payment status and paid amount 
app.put("/api/readings/:id/payment-status", async (req, res) => {
  try{
  console.log("📥 PUT /api/readings/:id")
  console.log("Params:", req.params)
  console.log("Body:", req.body)

  const {id} = req.params
  const {payment_status, paid_amount} = req.body

  const updateQuery = `
      UPDATE meter_readings
      SET payment_status = $1,
          paid_amount = $2
      WHERE id = $3
      RETURNING *
    `
  
    const result = await pool.query(updateQuery, [payment_status, paid_amount, id])
    res.json(result.rows[0])
  } catch (err) {
    console.error("Failed to update payment status:", err)
    res.status(500).json({ error: "Failed to update payment status" })
  }
}
)


// Get all payments for a reading
app.get("/api/payments/:meterReadingId", async (req, res) => {
  try {
    const { meterReadingId } = req.params
    const result = await pool.query(
      "SELECT * FROM payment_records WHERE meter_reading_id = $1 ORDER BY payment_date DESC",
      [meterReadingId]
    )
    res.json(result.rows)
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch payments" })
  }
})

app.listen(PORT, () => console.log("API server running on port 3001"))