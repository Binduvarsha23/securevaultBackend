import express from "express";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import fs from "fs";
import path from "path";

const router = express.Router();

// Path to store secrets
const secretsFile = path.join(process.cwd(), "userSecrets.json");

// Load secrets from file on startup
let userSecrets = {};
if (fs.existsSync(secretsFile)) {
  try {
    const data = fs.readFileSync(secretsFile, "utf-8");
    userSecrets = JSON.parse(data);
    console.log("[server] Loaded user secrets from file.");
  } catch (err) {
    console.error("[server] Failed to read secrets file:", err);
  }
}

// Helper to save secrets to file
const saveSecrets = () => {
  try {
    fs.writeFileSync(secretsFile, JSON.stringify(userSecrets, null, 2));
    console.log("[server] Secrets saved to file.");
  } catch (err) {
    console.error("[server] Failed to save secrets:", err);
  }
};

// ✅ Step 1: Generate QR and secret
router.post("/generate-qr", async (req, res) => {
  try {
    const { uid, email } = req.body;
    if (!uid || !email) return res.status(400).json({ message: "Missing uid or email" });

    const secret = speakeasy.generateSecret({
      name: `SecureVault (${email})`,
      length: 20,
    });

    userSecrets[uid] = secret.base32; // store in memory
    saveSecrets(); // persist to file

    const qrImage = await qrcode.toDataURL(secret.otpauth_url);

    res.json({ success: true, qrImage, secret: secret.base32 });
  } catch (err) {
    console.error("[server] Error generating QR:", err);
    res.status(500).json({ success: false, message: "Error generating QR" });
  }
});

// ✅ Step 2: Verify token
router.post("/verify-qr", (req, res) => {
  try {
    const { uid, token } = req.body;
    if (!uid || !token) return res.status(400).json({ success: false, message: "Missing uid or token" });

    const userSecret = userSecrets[uid];
    if (!userSecret) return res.status(400).json({ success: false, message: "No secret found. Generate QR again." });

    const verified = speakeasy.totp.verify({
      secret: userSecret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!verified) return res.status(401).json({ success: false, message: "Invalid or expired code." });

    res.json({ success: true, message: "Verification successful!" });
  } catch (err) {
    console.error("[server] Verification error:", err);
    res.status(500).json({ success: false, message: "Verification failed." });
  }
});

export default router;
