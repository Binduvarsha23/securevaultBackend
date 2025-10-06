import mongoose from "mongoose";

const vaultSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    url: { type: String },
    notes: { type: String },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Add unique index to prevent duplicates
vaultSchema.index({ userId: 1, title: 1, username: 1 }, { unique: true });

export default mongoose.model("Vault", vaultSchema);
