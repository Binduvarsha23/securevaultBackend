import mongoose from "mongoose";

// models/Vault.js
const vaultSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    url: { type: String },
    notes: { type: String },
    tags: { type: [String], default: [] }, // NEW: tags/folders
  },
  { timestamps: true }
);


export default mongoose.model("Vault", vaultSchema);

