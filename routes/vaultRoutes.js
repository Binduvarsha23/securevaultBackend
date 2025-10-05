import express from "express";
import {
  createVault,
  getVaultsByUser,
  updateVault,
  deleteVault,
} from "../controllers/vaultController.js";

const router = express.Router();

router.post("/", createVault); // POST /api/vault
router.get("/:userId", getVaultsByUser); // GET /api/vault/:userId
router.put("/:id", updateVault); // PUT /api/vault/:id
router.delete("/:id", deleteVault); // DELETE /api/vault/:id

export default router;
