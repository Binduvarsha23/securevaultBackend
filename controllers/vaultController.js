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
/**
 * ✅ IMPORT vaults from JSON
 */
export const importVaults = async (req, res) => {
  try {
    console.log("Import request received:", { userId: req.body.userId, vaultsCount: req.body.vaults?.length }); // Debug log

    const { userId, vaults } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    if (!Array.isArray(vaults)) {
      console.error("Invalid vaults format:", typeof vaults);
      return res.status(400).json({ message: "Invalid vault data: vaults must be an array" });
    }

    if (vaults.length === 0) {
      return res.status(400).json({ message: "No vaults to import" });
    }

    const createdVaults = [];
    const skippedVaults = [];

    for (const item of vaults) {
      try {
        // Validate required fields
        if (!item.title || !item.username || !item.password) {
          console.warn("Skipping invalid vault (missing required fields):", item.title || 'Unknown');
          skippedVaults.push(item.title || 'Unknown');
          continue;
        }

        // Ensure tags is an array
        item.tags = Array.isArray(item.tags) ? item.tags : item.tags ? [item.tags.toString()] : [];

        // Check for existing vault (by _id or userId + title + username)
        const existingVault = await Vault.findOne({
          $or: [
            { _id: item._id },
            { userId, title: item.title, username: item.username }
          ]
        });

        if (existingVault) {
          console.log("Skipping duplicate vault:", item.title);
          skippedVaults.push(item.title);
          continue;
        }

        // Create vault with ensured userId
        const vault = await Vault.create({
          userId,
          title: item.title,
          username: item.username,
          password: item.password,
          url: item.url,
          notes: item.notes,
          tags: item.tags,
          createdAt: item.createdAt || new Date(),
          updatedAt: item.updatedAt || new Date()
        });
        createdVaults.push(vault);
      } catch (itemError) {
        console.error("Error processing vault item:", item.title || 'Unknown', itemError);
        skippedVaults.push(item.title || 'Unknown');
      }
    }

    const response = {
      message: "Vaults imported successfully",
      count: createdVaults.length,
      skipped: skippedVaults.length
    };

    if (skippedVaults.length > 0) {
      response.message += ` (${skippedVaults.length} skipped - duplicates or invalid)`;
    }

    console.log("Import completed:", response);
    res.status(201).json(response);

  } catch (err) {
    console.error("Error importing vaults:", err);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
};
