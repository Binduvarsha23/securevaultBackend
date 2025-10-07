import express from "express";
import speakeasy from "speakeasy";
import qrcode from "qrcode";

const router = express.Router();
const userSecrets = {}; // ⚠️ Temporary store — replace with DB in production

// Generate QR (POST /api/generate-qr)
router.post("/generate-qr", async (req, res) => {
  try {
    console.log("[server] /generate-qr request body:", req.body);
    const { uid, email } = req.body;
    if (!uid || !email) {
      console.warn("[server] /generate-qr missing uid/email");
      return res.status(400).json({ message: "Missing uid or email" });
    }

    const secret = speakeasy.generateSecret({
      name: `SecureVault (${email})`,
      length: 20,
    });

    userSecrets[uid] = secret.base32;
    console.log(`[server] secret stored for uid=${uid}`);

    const qrImage = await qrcode.toDataURL(secret.otpauth_url);

    return res.json({
      success: true,
      qrImage,
      secret: secret.base32, // 👈 include secret for manual entry
    });
  } catch (err) {
    console.error("[server] Error generating QR:", err);
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
    console.log("[server] /verify-qr body:", req.body);
    const { uid, token } = req.body;
    if (!uid || !token) {
      console.warn("[server] /verify-qr missing uid/token");
      return res
        .status(400)
        .json({ success: false, message: "Missing uid or token" });
    }

    const userSecret = userSecrets[uid];
    if (!userSecret) {
      console.warn(`[server] /verify-qr no secret for uid=${uid}`);
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

    console.log(`[server] verification result for uid=${uid}:`, verified);

    if (!verified)
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired code." });

    return res.json({ success: true, message: "Verification successful!" });
  } catch (err) {
    console.error("[server] Verification error:", err);
    return res.status(500).json({
      success: false,
      message: "Verification failed",
      error: err?.message || err,
    });
  }
});

export default router;
