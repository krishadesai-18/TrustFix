import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase limit to allow base64 images for before/after photos
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// IN-MEMORY BACKEND STATE
interface Booking {
  status: "idle" | "booked" | "accepted" | "on_the_way" | "in_progress" | "completed" | "cancelled";
  category: string;
  date: string;
  timeSlot: string;
  problemDescription: string;
  paymentMethod: string;
  otp: string;
  beforePhoto: string | null;
  afterPhoto: string | null;
  customerRating: number;
  customerReview: string;
  recommend: boolean | null;
  amountPaid: number;
}

interface SlotStatus {
  [slot: string]: "available" | "unavailable" | "booked";
}

interface AppState {
  booking: Booking;
  slots: SlotStatus;
  notifications: Array<{ id: string; text: string; time: string }>;
}

const initialBookingState = (): Booking => ({
  status: "idle",
  category: "Electrical",
  date: "",
  timeSlot: "",
  problemDescription: "",
  paymentMethod: "",
  otp: "",
  beforePhoto: null,
  afterPhoto: null,
  customerRating: 0,
  customerReview: "",
  recommend: null,
  amountPaid: 515,
});

const initialSlotsState = (): SlotStatus => ({
  "10:00 a.m.": "available",
  "1:00 p.m.": "available",
  "3:00 p.m.": "available",
  "5:30 p.m.": "available",
});

let appState: AppState = {
  booking: initialBookingState(),
  slots: initialSlotsState(),
  notifications: [
    { id: "1", text: "Welcome to TrustFix! Ready for a productive day.", time: new Date().toLocaleTimeString() }
  ],
};

// HELPER: Generate 4-digit OTP
function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// API ENDPOINTS
app.get("/api/state", (req, res) => {
  res.json(appState);
});

// Create booking
app.post("/api/booking/create", (req, res) => {
  const { date, timeSlot, problemDescription, paymentMethod, beforePhoto, category } = req.body;

  if (!timeSlot) {
    return res.status(400).json({ error: "Please select a time slot." });
  }

  const currentSlotStatus = appState.slots[timeSlot];
  if (currentSlotStatus === "unavailable" || currentSlotStatus === "booked") {
    return res.status(400).json({ error: "Selected time slot is not available." });
  }

  // Update State
  appState.slots[timeSlot] = "booked";
  appState.booking = {
    ...initialBookingState(),
    status: "accepted",
    category: category || "Electrical",
    date: date || "Today",
    timeSlot,
    problemDescription: problemDescription || "No description provided.",
    paymentMethod: paymentMethod || "Cash after service",
    otp: generateOTP(),
    beforePhoto: beforePhoto || null,
  };

  // Add notification for Ramesh
  appState.notifications.unshift({
    id: Date.now().toString(),
    text: `New booking received from Ananya for Electrical service at ${timeSlot} is accepted!`,
    time: new Date().toLocaleTimeString(),
  });

  res.json({ success: true, booking: appState.booking });
});

// Accept booking
app.post("/api/booking/accept", (req, res) => {
  if (appState.booking.status !== "booked") {
    return res.status(400).json({ error: "No active booking to accept." });
  }

  appState.booking.status = "accepted";
  appState.notifications.unshift({
    id: Date.now().toString(),
    text: `You have accepted Ananya's booking for ${appState.booking.timeSlot}.`,
    time: new Date().toLocaleTimeString(),
  });

  res.json({ success: true, booking: appState.booking });
});

// Start trip
app.post("/api/booking/start-trip", (req, res) => {
  if (appState.booking.status !== "accepted") {
    return res.status(400).json({ error: "Booking must be accepted before starting the trip." });
  }

  appState.booking.status = "on_the_way";
  appState.notifications.unshift({
    id: Date.now().toString(),
    text: `On your way to Ananya's location for the ${appState.booking.timeSlot} job.`,
    time: new Date().toLocaleTimeString(),
  });

  res.json({ success: true, booking: appState.booking });
});

// Verify OTP to start job
app.post("/api/booking/verify-otp", (req, res) => {
  const { otp } = req.body;

  if (appState.booking.status !== "on_the_way") {
    return res.status(400).json({ error: "Service cannot be started yet." });
  }

  if (appState.booking.otp !== otp) {
    return res.status(400).json({ error: "Invalid verification OTP code. Please check with customer." });
  }

  appState.booking.status = "in_progress";
  appState.notifications.unshift({
    id: Date.now().toString(),
    text: `OTP verified successfully! Job is now in progress.`,
    time: new Date().toLocaleTimeString(),
  });

  res.json({ success: true, booking: appState.booking });
});

// Complete booking
app.post("/api/booking/complete", (req, res) => {
  const { afterPhoto } = req.body;

  if (appState.booking.status !== "in_progress") {
    return res.status(400).json({ error: "Job must be in progress to complete." });
  }

  appState.booking.status = "completed";
  appState.booking.afterPhoto = afterPhoto || null;
  
  appState.notifications.unshift({
    id: Date.now().toString(),
    text: `Job completed! Service details sent to the customer for review.`,
    time: new Date().toLocaleTimeString(),
  });

  res.json({ success: true, booking: appState.booking });
});

// Customer rating & review submission (resets active state after recording)
app.post("/api/booking/review", (req, res) => {
  const { rating, review, recommend } = req.body;

  if (appState.booking.status !== "completed") {
    return res.status(400).json({ error: "Cannot submit review for incomplete job." });
  }

  appState.booking.customerRating = rating || 5;
  appState.booking.customerReview = review || "Great job, very professional!";
  appState.booking.recommend = recommend !== undefined ? recommend : true;

  appState.notifications.unshift({
    id: Date.now().toString(),
    text: `Customer Ananya left a ${rating}-star review: "${review || "No text description"}"`,
    time: new Date().toLocaleTimeString(),
  });

  // Re-initialize booking back to idle but keep a completed stamp or clear
  // Let's reset the active booking but keep the slots as booked (or we can release them)
  // To keep it clean, we can save the rating but reset the booking screen back to home
  appState.booking = {
    ...appState.booking,
    status: "idle", // Ready for a new booking
  };

  res.json({ success: true, booking: appState.booking });
});

// Skip review endpoint
app.post("/api/booking/skip-review", (req, res) => {
  if (appState.booking.status !== "completed") {
    return res.status(400).json({ error: "Cannot skip review for incomplete job." });
  }

  appState.notifications.unshift({
    id: Date.now().toString(),
    text: `Customer Ananya chose to continue without giving a review.`,
    time: new Date().toLocaleTimeString(),
  });

  appState.booking = {
    ...appState.booking,
    status: "idle",
  };

  res.json({ success: true, booking: appState.booking });
});

// Cancel booking (safety valve)
app.post("/api/booking/cancel", (req, res) => {
  const activeSlot = appState.booking.timeSlot;
  if (activeSlot) {
    appState.slots[activeSlot] = "available";
  }

  appState.booking = initialBookingState();
  appState.booking.status = "cancelled";

  appState.notifications.unshift({
    id: Date.now().toString(),
    text: `Booking has been cancelled.`,
    time: new Date().toLocaleTimeString(),
  });

  res.json({ success: true, booking: appState.booking });
});

// Toggle slot availability
app.post("/api/slots/toggle", (req, res) => {
  const { slot } = req.body;

  if (!slot || !(slot in appState.slots)) {
    return res.status(400).json({ error: "Invalid slot name." });
  }

  const currentStatus = appState.slots[slot];
  if (currentStatus === "booked") {
    return res.status(400).json({ error: "Cannot toggle a slot that is already booked." });
  }

  appState.slots[slot] = currentStatus === "available" ? "unavailable" : "available";
  
  appState.notifications.unshift({
    id: Date.now().toString(),
    text: `Toggled availability for slot: ${slot} to ${appState.slots[slot]}`,
    time: new Date().toLocaleTimeString(),
  });

  res.json({ success: true, slots: appState.slots });
});

// Reset full state
app.post("/api/state/reset", (req, res) => {
  appState = {
    booking: initialBookingState(),
    slots: initialSlotsState(),
    notifications: [
      { id: "1", text: "State reset successful. Ready for fresh operations.", time: new Date().toLocaleTimeString() }
    ],
  };
  res.json({ success: true, state: appState });
});

// INTEGRATE VITE MIDDLEWARE
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
