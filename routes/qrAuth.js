import express from "express";
import speakeasy from "speakeasy";
import qrcode from "qrcode";

const router = express.Router();
const userSecrets = {}; // Temporary store; ideally use MongoDB later

// ✅ Step 1: Generate QR and secret
router.post("/generate-qr", async (req, res) => {
  try {
    const { uid, email } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ message: "Missing uid or email" });
    }

    // Create a new secret
    const secret = speakeasy.generateSecret({
      name: `SecureVault (${email})`,
      length: 20,
    });

    userSecrets[uid] = secret.base32;

    // Convert to QR image data
    const qrImage = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      qrImage,
      secret: secret.base32,
    });
  } catch (err) {
    console.error("Error generating QR:", err);
    res.status(500).json({ success: false, message: "Error generating QR" });
  }
});

// ✅ Step 2: Verify QR code (token from app)
router.post("/verify-qr", (req, res) => {
  try {
    const { uid, token } = req.body;
    const userSecret = userSecrets[uid];

    if (!userSecret) {
      return res.status(400).json({ success: false, message: "No secret found. Please generate QR again." });
    }

    const verified = speakeasy.totp.verify({
      secret: userSecret,
      encoding: "base32",
      token,
      window: 1, // small tolerance for time drift
    });

    if (!verified) {
      return res.status(401).json({ success: false, message: "Invalid or expired code." });
    }

    res.json({ success: true, message: "Verification successful!" });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ success: false, message: "Verification failed." });
  }
});

export default router;
