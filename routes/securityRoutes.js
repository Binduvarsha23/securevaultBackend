import express from "express";
import SecurityConfig from "../models/securityConfig.js";
import { authenticator } from "otplib";

const router = express.Router();

// ------------------- Get User Config -------------------
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
    console.error("Error fetching config:", err);
    res.status(500).json({ message: "Error fetching config", error: err.message });
  }
});

// ------------------- Create Default Config -------------------
router.post("/", async (req, res) => {
  const { userId } = req.body;
  try {
    const existing = await SecurityConfig.findOne({ userId });
    if (existing) return res.status(400).json({ message: "Already exists" });

    const config = new SecurityConfig({ userId });
    await config.save();
    res.status(201).json(config);
  } catch (err) {
    console.error("Error creating config:", err);
    res.status(500).json({ message: "Error creating config", error: err.message });
  }
});

// ------------------- Update Config -------------------
router.put("/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
const update = {};

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

    if ('totpEnabled' in req.body) {
      update.totpEnabled = req.body.totpEnabled;
      if ('totpSecret' in req.body) update.totpSecret = req.body.totpSecret;
    }

    update.updatedAt = new Date();

    const config = await SecurityConfig.findOneAndUpdate(
      { userId },
      { $set: update },
      { new: true, upsert: true }
    );

    res.json(config);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Error updating config", error: err.message });
  }
});

// ------------------- Verify Method -------------------
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
    }

    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    config.lastVerifiedAt = new Date();
    await config.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Verification failed:", err);
    res.status(500).json({ message: "Verification failed", error: err.message });
  }
});

// ------------------- Setup TOTP -------------------
router.post("/setup-totp/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const config = await SecurityConfig.findOne({ userId });
    if (!config) return res.status(404).json({ message: "User config not found" });

    const secret = authenticator.generateSecret();
    config.totpSecret = secret;
    config.totpEnabled = true;
    await config.save();

    const otpauthUrl = authenticator.keyuri(
      `${userId}@securevault`,
      "SecureVault",
      secret
    );

    res.json({ secret, otpauthUrl });
  } catch (err) {
    console.error("TOTP setup error:", err);
    res.status(500).json({ message: "Error setting up TOTP", error: err.message });
  }
});

// ------------------- Verify TOTP -------------------
router.post("/verify-totp", async (req, res) => {
  const { userId, code } = req.body;
  try {
    const config = await SecurityConfig.findOne({ userId });
    if (!config || !config.totpEnabled || !config.totpSecret)
      return res.status(400).json({ message: "TOTP not set up" });

    const isValid = authenticator.check(code, config.totpSecret);
    if (!isValid) return res.status(401).json({ message: "Invalid TOTP code" });

    config.lastVerifiedAt = new Date();
    await config.save();

    res.json({ success: true });
  } catch (err) {
    console.error("TOTP verification error:", err);
    res.status(500).json({ message: "TOTP verification failed", error: err.message });
  }
});

// ------------------- Security Questions -------------------
router.put("/security-questions/:userId", async (req, res) => {
  const { questions } = req.body;

  if (!Array.isArray(questions) || questions.length !== 3) {
    return res.status(400).json({ message: "3 security questions required" });
  }

  try {
    const config = await SecurityConfig.findOneAndUpdate(
      { userId: req.params.userId },
      { $set: { securityQuestions: questions, securityQuestionsLastUpdatedAt: new Date() } },
      { new: true }
    );
    res.json(config);
  } catch (err) {
    console.error("Error saving questions:", err);
    res.status(500).json({ message: "Error saving questions", error: err.message });
  }
});

// ------------------- Verify Security Answer -------------------
router.post("/verify-security-answer", async (req, res) => {
  const { userId, question, answer } = req.body;
  try {
    const config = await SecurityConfig.findOne({ userId });
    if (!config || !config.securityQuestions?.length)
      return res.status(404).json({ message: "No security questions set" });

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
    console.error("Verification failed:", err);
    res.status(500).json({ message: "Verification failed", error: err.message });
  }
});

// ------------------- Reset Method With Token -------------------
router.post("/reset-method-with-token", async (req, res) => {
  const { userId, token, methodType, newValue } = req.body;
  try {
    const config = await SecurityConfig.findOne({ userId });
    if (!config || !config.passwordResetToken || !config.passwordResetTokenExpiry || config.passwordResetTokenExpiry < new Date()) {
      return res.status(400).json({ message: "Invalid or expired reset code." });
    }

    const bcrypt = await import("bcryptjs");
    const isTokenValid = await bcrypt.compare(token, config.passwordResetToken);
    if (!isTokenValid) return res.status(400).json({ message: "Invalid reset code." });

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
    console.error("Error resetting method:", err);
    res.status(500).json({ message: "Error resetting method", error: err.message });
  }
});

export default router;

