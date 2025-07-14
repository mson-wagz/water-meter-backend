"use server"

import {
  fetchMeterReadings as dbFetchMeterReadings,
  addMeterReading as dbAddMeterReading,
  editMeterReading as dbEditMeterReading,
  removeMeterReading as dbRemoveMeterReading,
  addPayment as dbAddPayment,
} from "./database"

export async function fetchMeterReadings() {
  try {
    const readings = await dbFetchMeterReadings()
    return { success: true, data: readings.data }
  } catch (error) {
    console.error("Error in fetchMeterReadings:", error)
    return { success: false, error: "Failed to fetch meter readings" }
  }
}

export async function addMeterReading(formData) {
  try {
    const unitNumber = formData.get("unitNumber")
    const previousReading = Number.parseFloat(formData.get("previousReading"))
    const currentReading = Number.parseFloat(formData.get("currentReading"))
    const pricePerUnit = Number.parseFloat(formData.get("pricePerUnit"))
    const readingDate = formData.get("readingDate")
    const dueDate = formData.get("dueDate")

    const unitsConsumed = Math.max(0, currentReading - previousReading)
    const totalAmount = unitsConsumed * pricePerUnit

    const newReading = await dbAddMeterReading({
      unitNumber,
      previousReading,
      currentReading,
      unitsConsumed,
      pricePerUnit,
      totalAmount,
      readingDate,
      dueDate,
      paymentStatus: "unpaid",
      paidAmount: 0,
    })

    return { success: true, data: newReading.data }
  } catch (error) {
    console.error("Error in addMeterReading:", error)
    return { success: false, error: "Failed to add meter reading" }
  }
}

export async function editMeterReading(id, formData) {
  try {
    const unitNumber = formData.get("unitNumber")
    const previousReading = Number.parseFloat(formData.get("previousReading"))
    const currentReading = Number.parseFloat(formData.get("currentReading"))
    const pricePerUnit = Number.parseFloat(formData.get("pricePerUnit"))
    const readingDate = formData.get("readingDate")
    const dueDate = formData.get("dueDate")

    const unitsConsumed = Math.max(0, currentReading - previousReading)
    const totalAmount = unitsConsumed * pricePerUnit

    const updatedReading = await dbEditMeterReading(id, {
      unitNumber,
      previousReading,
      currentReading,
      unitsConsumed,
      pricePerUnit,
      totalAmount,
      readingDate,
      dueDate,
    })

    return { success: true, data: updatedReading.data }
  } catch (error) {
    console.error("Error in editMeterReading:", error)
    return { success: false, error: "Failed to update meter reading" }
  }
}

export async function removeMeterReading(id) {
  try {
    await dbRemoveMeterReading(id)
    return { success: true }
  } catch (error) {
    console.error("Error in removeMeterReading:", error)
    return { success: false, error: "Failed to delete meter reading" }
  }
}

export async function addPayment(meterReadingId, formData) {
  try {
    const amount = Number.parseFloat(formData.get("amount"))
    const paymentDate = formData.get("paymentDate")
    const method = formData.get("method")
    const notes = formData.get("notes") || ""

    // Create the payment record
    await dbAddPayment(meterReadingId, {
      amount,
      paymentDate,
      method,
      notes,
    })

    // Get the current reading to update paid amount and status
    const readings = await dbFetchMeterReadings()
    const reading = readings.data.find((r) => r.id === meterReadingId)

    if (reading) {
      const newPaidAmount = reading.paidAmount + amount
      let paymentStatus = "unpaid"

      if (newPaidAmount >= reading.totalAmount) {
        paymentStatus = "paid"
      } else if (newPaidAmount > 0) {
        paymentStatus = "partial"
      }

      await dbEditMeterReading(meterReadingId, {
        paidAmount: newPaidAmount,
        paymentStatus,
      })
    }

    return { success: true }
  } catch (error) {
    console.error("Error in addPayment:", error)
    return { success: false, error: "Failed to add payment" }
  }
}

export async function updatePaymentStatus(
  meterReadingId,
  status,
  partialAmount,
  paymentDate,
  notes,
) {
  try {
    const readings = await dbFetchMeterReadings()
    const reading = readings.data.find((r) => r.id === meterReadingId)

    if (!reading) {
      return { success: false, error: "Reading not found" }
    }

    let newPaidAmount = reading.paidAmount
    let paymentToAdd = 0

    if (status === "paid") {
      paymentToAdd = reading.totalAmount - reading.paidAmount
      newPaidAmount = reading.totalAmount
    } else if (status === "partial" && partialAmount !== undefined) {
      paymentToAdd = partialAmount - reading.paidAmount
      newPaidAmount = partialAmount
    } else if (status === "unpaid") {
      // Keep current paid amount, just update status
      newPaidAmount = reading.paidAmount
    }

    // Add payment record if there's a payment amount
    if (paymentToAdd > 0) {
      await dbAddPayment(meterReadingId, {
        amount: paymentToAdd,
        paymentDate: paymentDate || new Date().toISOString().split("T")[0],
        method: "other",
        notes: notes || `Status updated to ${status} by landlord`,
      })
    }

    // Update the reading
    await dbEditMeterReading(meterReadingId, {
      paidAmount: newPaidAmount,
      paymentStatus: status,
    })

    return { success: true }
  } catch (error) {
    console.error("Error in updatePaymentStatus:", error)
    return { success: false, error: "Failed to update payment status" }
  }
}
