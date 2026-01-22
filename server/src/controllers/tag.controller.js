import * as tagService from '../services/tag.service.js';

export const getTags = async (req, res) => {
  try {
    const tags = await tagService.getAllTags();
    res.json(tags);
  } catch (error) {
    console.error("Get Tags Error:", error);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
};
