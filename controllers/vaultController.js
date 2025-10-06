import Vault from "../models/Vault.js";

/**
 * ✅ CREATE a new vault entry
 */
export const createVault = async (req, res) => {
  try {
    const { userId, title, username, password, url, notes, tags } = req.body;

    // ⚠️ Already encrypted on frontend
    const vault = await Vault.create({
      userId,
      title,
      username,
      password,
      url,
      notes,
      tags: tags || [],
    });

    res.status(201).json(vault);
  } catch (err) {
    console.error("Error creating vault:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ GET all vaults for a specific user
 */
export const getVaultsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const vaults = await Vault.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(vaults);
  } catch (err) {
    console.error("Error fetching vaults:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ UPDATE vault entry
 */
export const updateVault = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, username, password, url, notes, tags } = req.body;

    const vault = await Vault.findByIdAndUpdate(
      id,
      { title, username, password, url, notes, tags: tags || [] },
      { new: true }
    );

    if (!vault) return res.status(404).json({ message: "Vault not found" });

    res.status(200).json(vault);
  } catch (err) {
    console.error("Error updating vault:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ DELETE vault entry
 */
export const deleteVault = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Vault.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ message: "Vault not found" });
    res.status(200).json({ message: "Vault deleted" });
  } catch (err) {
    console.error("Error deleting vault:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ EXPORT vaults for a user as JSON (already encrypted)
 */
export const exportVaults = async (req, res) => {
  try {
    const { userId } = req.params;
    const vaults = await Vault.find({ userId });
    res.setHeader("Content-Disposition", `attachment; filename=vault_${userId}.json`);
    res.setHeader("Content-Type", "application/json");
    res.status(200).send(JSON.stringify(vaults));
  } catch (err) {
    console.error("Error exporting vaults:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ IMPORT vaults from JSON
 */
export const importVaults = async (req, res) => {
  try {
    const { userId, vaults } = req.body; // vaults = array of encrypted vault items

    if (!Array.isArray(vaults)) return res.status(400).json({ message: "Invalid vault data" });

    const createdVaults = [];
    for (const item of vaults) {
      // Ensure each item has userId set correctly
      const vault = await Vault.create({ ...item, userId });
      createdVaults.push(vault);
    }

    res.status(201).json({ message: "Vaults imported", count: createdVaults.length });
  } catch (err) {
    console.error("Error importing vaults:", err);
    res.status(500).json({ message: "Server error" });
  }
};
