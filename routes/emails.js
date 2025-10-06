import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// POST /api/send-totp
router.post("/send-totp", async (req, res) => {
  const { email, totp } = req.body;

  if (!email || !totp)
    return res.status(400).json({ message: "Email and TOTP required" });

  try {
    // Gmail SMTP setup
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // app password from Google
      },
    });

    // email content
    const mailOptions = {
      from: `"SecureVault" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your SecureVault Verification Code",
      html: `
        <div style="font-family:sans-serif;">
          <h2>SecureVault Login Verification</h2>
          <p>Your one-time code is:</p>
          <div style="font-size:24px; font-weight:bold; color:#2c3e50;">${totp}</div>
          <p>This code expires in 60 seconds. Do not share it.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "TOTP email sent" });
  } catch (err) {
    console.error("Error sending email:", err);
    res.status(500).json({ message: "Failed to send TOTP" });
  }
});

export default router;
