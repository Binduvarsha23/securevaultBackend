import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// POST /api/send-totp
router.post("/send-totp", async (req, res) => {
  const { email, totp } = req.body;

  if (!email || !totp) {
    console.error("❌ Missing email or TOTP in request body");
    return res.status(400).json({ message: "Email and TOTP required" });
  }

  console.log("📩 Preparing to send TOTP email...");
  console.log("Recipient:", email);
  console.log("TOTP:", totp);

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // 16-character App Password
      },
    });

    // Verify transporter connection before sending
    await transporter.verify();
    console.log("✅ SMTP connection successful");

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

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);

    res.status(200).json({ message: "TOTP email sent successfully" });
  } catch (err) {
    console.error("🚨 Error sending email:");
    console.error("Name:", err.name);
    console.error("Message:", err.message);
    console.error("Stack:", err.stack);
    res.status(500).json({ message: "Failed to send TOTP", error: err.message });
  }
});

export default router;
