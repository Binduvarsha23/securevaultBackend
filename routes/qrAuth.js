import express from "express";
import speakeasy from "speakeasy";
import qrcode from "qrcode";

const router = express.Router();
const userSecrets = {}; // ⚠️ Temporary store — replace with DB in production

// Generate QR (POST /api/generate-qr)
router.post("/generate-qr", async (req, res) => {
  try {
    const { uid, email } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ message: "Missing uid or email" });
    }

    const secret = speakeasy.generateSecret({
      name: `SecureVault (${email})`,
      length: 20,
    });

    userSecrets[uid] = secret.base32;

    const qrImage = await qrcode.toDataURL(secret.otpauth_url);

    return res.json({
      success: true,
      qrImage,
      secret: secret.base32, // 👈 include secret for manual entry
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error generating QR",
      error: err?.message || err,
    });
  }
});

// Verify token (POST /api/verify-qr)
router.post("/verify-qr", (req, res) => {
  try {
    const { uid, token } = req.body;
    if (!uid || !token) {
      return res
        .status(400)
        .json({ success: false, message: "Missing uid or token" });
    }

    const userSecret = userSecrets[uid];
    if (!userSecret) {
      return res
        .status(400)
        .json({ success: false, message: "No secret found. Generate QR again." });
    }

    const verified = speakeasy.totp.verify({
      secret: userSecret,
      encoding: "base32",
      token,
      window: 1,
    });


    if (!verified)
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired code." });

    return res.json({ success: true, message: "Verification successful!" });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Verification failed",
      error: err?.message || err,
    });
  }
});

export default router;
