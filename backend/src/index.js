import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import validationRoutes from "./routes/validation.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (_req, res) => {
  res.json({ status: "Validation backend running", port: PORT });
});

// Routes
app.use("/api/validate", validationRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Validation backend running on http://localhost:${PORT}`);
});
