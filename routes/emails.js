import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function sendTestTOTP() {
  const testEmail = "binduvarshasunkara@gmail.com"; // recipient
  const totp = Math.floor(100000 + Math.random() * 900000); // 6-digit code

  console.log("📩 Sending TOTP:", totp, "to", testEmail);

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false, // TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.verify();
    console.log("✅ SMTP connection verified");

    const info = await transporter.sendMail({
      from: `"SecureVault" <${process.env.EMAIL_USER}>`,
      to: testEmail,
      subject: "SecureVault TOTP Test",
      html: `
        <div style="font-family:sans-serif;">
          <h2>SecureVault Login Verification</h2>
          <p>Your one-time code is:</p>
          <div style="font-size:24px; font-weight:bold; color:#2c3e50;">${totp}</div>
          <p>This code expires in 5 minutes. Do not share it.</p>
        </div>
      `,
    });

    console.log("✅ Email sent! Message ID:", info.messageId);
    console.log("Response:", info.response);
  } catch (err) {
    console.error("🚨 Error sending email:", err);
  }
}

sendTestTOTP();
