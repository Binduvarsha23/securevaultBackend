import Vault from "../models/Vault.js";

// ✅ CREATE new vault entry
export const createVault = async (req, res) => {
  try {
    const { userId, title, username, password, url, notes } = req.body;

    // ⚠️ Don't stringify — already encrypted on frontend
    const vault = await Vault.create({
      userId,
      title,
      username,
      password,
      url,
      notes,
    });

    res.status(201).json(vault);
  } catch (err) {
    console.error("Error creating vault:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ GET vaults for a specific user
export const getVaultsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const vaults = await Vault.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(vaults);
  } catch (error) {
    console.error("Error fetching vaults:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ UPDATE vault entry
export const updateVault = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, username, password, url, notes } = req.body;

    // ⚠️ No extra stringify
    const vault = await Vault.findByIdAndUpdate(
      id,
      {
        title,
        username,
        password,
        url,
        notes,
      },
      { new: true }
    );

    res.json(vault);
  } catch (err) {
    console.error("Error updating vault:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ DELETE vault entry
export const deleteVault = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Vault.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ message: "Vault not found" });
    res.status(200).json({ message: "Vault deleted" });
  } catch (error) {
    console.error("Error deleting vault:", error);
    res.status(500).json({ message: "Server error" });
  }
};
