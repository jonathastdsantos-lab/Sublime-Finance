import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import twilio from "twilio";
import sgMail from "@sendgrid/mail";

dotenv.config();

// Initialize APIs
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) 
  : null;

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- API ROUTES ---

  // 1. Twilio Verify - Start Verification
  app.post("/api/auth/verify/start", async (req, res) => {
    const { phoneNumber } = req.body;
    if (!twilioClient || !process.env.TWILIO_VERIFY_SERVICE_SID) {
      return res.status(500).json({ error: "Twilio not configured" });
    }
    try {
      const verification = await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({ to: phoneNumber, channel: "sms" });
      res.json({ status: verification.status });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // 2. Twilio Verify - Check Code
  app.post("/api/auth/verify/check", async (req, res) => {
    const { phoneNumber, code } = req.body;
    if (!twilioClient || !process.env.TWILIO_VERIFY_SERVICE_SID) {
      return res.status(500).json({ error: "Twilio not configured" });
    }
    try {
      const check = await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({ to: phoneNumber, code });
      res.json({ status: check.status, valid: check.valid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // 3. SendGrid - Send Welcome/Report Email
  app.post("/api/email/send", async (req, res) => {
    const { to, subject, text, html } = req.body;
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
      return res.status(500).json({ error: "SendGrid not configured" });
    }
    try {
      await sgMail.send({
        to,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject,
        text,
        html,
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // --- VITE MIDDLEWARE ---
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
