
import pool from "./db"

// Fetch all meter readings
export async function fetchMeterReadings() {
  const res = await pool.query("SELECT * FROM meter_readings ORDER BY reading_date DESC")
  return { data: res.rows }
}

// Add a new meter reading
export async function addMeterReading(data) {
  const {
    unitNumber,
    previousReading,
    currentReading,
    unitsConsumed,
    pricePerUnit,
    totalAmount,
    readingDate,
    dueDate,
    paymentStatus,
    paidAmount,
  } = data

  const insertQuery = `
    INSERT INTO meter_readings
      (unit_number, previous_reading, current_reading, units_consumed, price_per_unit, total_amount, reading_date, due_date, payment_status, paid_amount)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
    paymentStatus,
    paidAmount,
  ]
  const res = await pool.query(insertQuery, values)
  return { data: res.rows[0] }
}

// Edit an existing meter reading
export async function editMeterReading(id, data) {
  const {
    unitNumber,
    previousReading,
    currentReading,
    unitsConsumed,
    pricePerUnit,
    totalAmount,
    readingDate,
    dueDate,
    paymentStatus,
    paidAmount,
  } = data

  const updateQuery = `
    UPDATE meter_readings
    SET unit_number = $1,
        previous_reading = $2,
        current_reading = $3,
        units_consumed = $4,
        price_per_unit = $5,
        total_amount = $6,
        reading_date = $7,
        due_date = $8,
        payment_status = COALESCE($9, payment_status),
        paid_amount = COALESCE($10, paid_amount)
    WHERE id = $11
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
    paymentStatus,
    paidAmount,
    id,
  ]
  const res = await pool.query(updateQuery, values)
  return { data: res.rows[0] }
}

// Remove a meter reading
export async function removeMeterReading(id) {
  await pool.query("DELETE FROM meter_readings WHERE id = $1", [id])
  return { data: true }
}

// Add a payment record
export async function addPayment(meterReadingId, data) {
  const { amount, paymentDate, method, notes } = data

  const insertPayment = `
    INSERT INTO payment_records
      (meter_reading_id, amount, payment_date, payment_method, notes)
    VALUES
      ($1, $2, $3, $4, $5)
    RETURNING *
  `
  const values = [meterReadingId, amount, paymentDate, method, notes]
  const res = await pool.query(insertPayment, values)
  return { data: res.rows[0] }
}