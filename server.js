import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import securityRoutes from "./routes/securityRoutes.js";
import vaultRoutes from "./routes/vaultRoutes.js";


dotenv.config();    
const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json()); // built-in body parser
app.use("/api/security", securityRoutes);
app.use("/api/vault", vaultRoutes);

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    }); 
    })