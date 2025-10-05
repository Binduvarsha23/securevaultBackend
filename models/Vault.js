import mongoose from "mongoose";

const vaultSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // from frontend
    title: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true }, // encrypted on frontend
    url: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Vault", vaultSchema);
