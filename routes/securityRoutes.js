import express from "express";
import SecurityConfig from "../models/securityConfig.js";
import nodemailer from "nodemailer";

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Get user's config
router.get("/:userId", async (req, res) => {
  try {
    const config = await SecurityConfig.findOne({ userId: req.params.userId });

    if (!config) {
      return res.status(200).json({
        setupRequired: true,
        message: "Security config not found. User has not set up anything yet.",
        config: null,
      });
    }

    res.json({ setupRequired: false, config });
  } catch (err) {
    res.status(500).json({ message: "Error fetching config" });
  }
});

// Create default config
router.post("/", async (req, res) => {
  const { userId } = req.body;
  try {
    const existing = await SecurityConfig.findOne({ userId });
    if (existing) return res.status(400).json({ message: "Already exists" });

    const config = new SecurityConfig({ userId });
    await config.save();
    res.status(201).json(config);
  } catch (err) {
    res.status(500).json({ message: "Error creating config" });
  }
});

// Update config
router.put("/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const update = {};

    // Handle each auth method explicitly
    if ('passwordEnabled' in req.body) {
      update.passwordEnabled = req.body.passwordEnabled;
      if (req.body.passwordHash) update.passwordHash = req.body.passwordHash;
    }

    if ('pinEnabled' in req.body) {
      update.pinEnabled = req.body.pinEnabled;
      if (req.body.pinHash) update.pinHash = req.body.pinHash;
    }

    if ('patternEnabled' in req.body) {
      update.patternEnabled = req.body.patternEnabled;
      if (req.body.patternHash) update.patternHash = req.body.patternHash;
    }

    if ('biometricEnabled' in req.body) {
      update.biometricEnabled = req.body.biometricEnabled;
      if (!req.body.biometricEnabled) {
        // If disabling, clear credentials
        update.biometricCredentials = [];
      } else if (req.body.biometricCredentials) {
        // If enabling AND new credentials are provided from frontend, set them
        // This assumes the frontend sends the full array, including existing ones
        update.biometricCredentials = req.body.biometricCredentials;
      }
    }
    
    // Ensure biometricHash is explicitly removed if it's sent from frontend and not needed
    // This handles cases where frontend might send null/undefined for it.
    if ('biometricHash' in req.body) {
        update.biometricHash = req.body.biometricHash; // Will be null from frontend
    }


    update.updatedAt = new Date();

const config = await SecurityConfig.findOneAndUpdate(
  { userId },
  { $set: update }, // ✅ use the cleaned + safe update object
  { new: true, upsert: true }
);

    if (!config) return res.status(404).json({ message: "Config not found" });
    res.json(config);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Error updating config" });
  }
});

// Verify method
router.post("/verify", async (req, res) => {
  const { userId, value, method } = req.body;
  try {
    const config = await SecurityConfig.findOne({ userId });
    if (!config) return res.status(404).json({ message: "Config not found" });

    const bcrypt = await import("bcryptjs");
    let isMatch = false;

    if (method === "pin" && config.pinHash) {
      isMatch = await bcrypt.compare(value, config.pinHash);
    } else if (method === "password" && config.passwordHash) {
      isMatch = await bcrypt.compare(value, config.passwordHash);
    } else if (method === "pattern" && config.patternHash) {
      isMatch = await bcrypt.compare(value, config.patternHash);
    } else if (method === "biometric") {
      // For biometric, the actual verification happens on the client side
      // with the WebAuthn API. The backend would typically verify the
      // attestation/assertion from the client.
      // For this simplified demo, we'll assume the client-side WebAuthn call
      // was successful if it reached here.
      isMatch = true;
    }

    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    config.lastVerifiedAt = new Date();
    await config.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Verification failed" });
  }
});

router.put("/security-questions/:userId", async (req, res) => {
  const { questions } = req.body;

  if (!Array.isArray(questions) || questions.length !== 3) {
    return res.status(400).json({ message: "3 security questions required" });
  }

  try {
    const config = await SecurityConfig.findOneAndUpdate(
      { userId: req.params.userId },
      {
        $set: {
          securityQuestions: questions, // ✅ Already hashed from frontend
          securityQuestionsLastUpdatedAt: new Date(),
        },
      },
      { new: true }
    );

    res.json(config);
  } catch (err) {
    console.error("Error saving questions:", err);
    res.status(500).json({ message: "Error saving questions" });
  }
});

// Verify one security answer
router.post("/verify-security-answer", async (req, res) => {
  const { userId, question, answer } = req.body;

  try {
    const config = await SecurityConfig.findOne({ userId });
    if (!config || !config.securityQuestions?.length) {
      return res.status(404).json({ message: "No security questions set" });
    }

    const bcrypt = await import("bcryptjs");
    const match = await Promise.all(
      config.securityQuestions
        .filter((q) => q.question === question)
        .map(async (q) => await bcrypt.compare(answer, q.answerHash))
    );

    if (match.includes(true)) {
      config.lastVerifiedAt = new Date();
      await config.save();
      return res.json({ success: true });
    } else {
      return res.status(401).json({ message: "Incorrect answer" });
    }
  } catch (err) {
    res.status(500).json({ message: "Verification failed" });
  }
});

router.post("/request-method-reset", async (req, res) => {
  try {
    const { email, userId } = req.body;

    if (!email || !userId) {
      return res.status(400).json({ message: "Email and userId are required" });
    }

    console.log("Incoming reset request for:", email, userId);

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const bcrypt = await import("bcryptjs");
    const hashedToken = await bcrypt.hash(resetCode, 10);

    await SecurityConfig.findOneAndUpdate(
      { userId },
      {
        $set: {
          passwordResetToken: hashedToken,
          passwordResetTokenExpiry: resetExpiresAt,
        },
      },
      { upsert: true }
    );

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your Password Reset Code",
        text: `Your reset code is: ${resetCode}. It will expire in 10 minutes.`,
      });

      console.log("✅ Email sent to:", email);
      res.json({ success: true, message: "Reset code sent successfully" });
    } catch (emailError) {
      console.error("❌ Failed to send email:", emailError);
      return res.status(500).json({ message: "Failed to send email", error: emailError.message });
    }
  } catch (error) {
    console.error("Reset method error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// Reset method using token
router.post("/reset-method-with-token", async (req, res) => {
  const { userId, token, methodType, newValue } = req.body;

  try {
    const config = await SecurityConfig.findOne({ userId });
    if (
      !config ||
      !config.passwordResetToken ||
      !config.passwordResetTokenExpiry ||
      config.passwordResetTokenExpiry < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired reset code." });
    }

    const bcrypt = await import("bcryptjs");
    const isTokenValid = await bcrypt.compare(token, config.passwordResetToken);
    if (!isTokenValid) {
      return res.status(400).json({ message: "Invalid reset code." });
    }

    const hashedNewValue = await bcrypt.hash(newValue, 10);

    if (methodType === "password") {
      config.passwordHash = hashedNewValue;
      config.passwordEnabled = true;
    } else if (methodType === "pin") {
      config.pinHash = hashedNewValue;
      config.pinEnabled = true;
    } else if (methodType === "pattern") {
      config.patternHash = hashedNewValue;
      config.patternEnabled = true;
    } else {
      return res.status(400).json({ message: "Invalid method type." });
    }

    config.passwordResetToken = null;
    config.passwordResetTokenExpiry = null;
    await config.save();

    res.json({ success: true, message: `${methodType} has been reset successfully.` });
  } catch (err) {
    res.status(500).json({ message: "Error resetting method." });
  }
});

export default router;