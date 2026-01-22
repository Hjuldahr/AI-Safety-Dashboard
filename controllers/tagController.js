import Tag from '../models/tag.js';

const listTags = async (req, res) => {
    try {
        const tags = await Tag.find().sort({ name: 1 }).lean();
        return res.status(200).json({ tags });
    } catch (error) {
        console.error('Error listing tags:', error);
        return res.status(500).json({ message: 'Failed to list tags.' });
    }
};

const createTag = async (req, res) => {
    try {
        const { name, color } = req.body;
        const existing = await Tag.findOne({ name: name.trim() });
        if (existing) return res.status(200).json({ tag: existing });
        const tag = await Tag.create({ name: name.trim(), color: color || '#888888' });
        return res.status(201).json({ tag });
    } catch (error) {
        console.error('Error creating tag:', error);
        return res.status(500).json({ message: 'Failed to create tag.' });
    }
};

// POST /tags/sync - position-based sync of tag list
const syncTags = async (req, res) => {
    try {
        const { originalIds, newNames, colors, deletions } = req.body;
        if (!Array.isArray(originalIds) || !Array.isArray(newNames)) return res.status(400).json({ message: 'originalIds and newNames must be arrays' });

        // Normalize names
        const cleaned = newNames.map(n => (n && String(n).trim()) || '');
        if (cleaned.some(n => n === '')) return res.status(400).json({ message: 'Tag names cannot be empty' });

        // Mongoose and models for pull/delete operations
        const mongoose = (await import('mongoose')).default;
        const Alert = (await import('../models/alert_model.js')).default;
        const AlertLog = (await import('../models/alert_log.js')).default;

        // 1. TRACK DELETIONS
        const deletionSet = new Set(deletions || []);

        // 2. PERFORM DELETIONS FIRST
        if (deletions && deletions.length) {
            for (const idToDelete of deletions) {
                if (!idToDelete) continue;
                try {
                    await Alert.updateMany({ tags: idToDelete }, { $pull: { tags: new mongoose.Types.ObjectId(idToDelete) } });
                    await AlertLog.updateMany({ tags: idToDelete }, { $pull: { tags: new mongoose.Types.ObjectId(idToDelete) } });
                    await Tag.findByIdAndDelete(idToDelete);
                } catch (err) {
                    console.error(`Failed to delete tag ${idToDelete}:`, err);
                }
            }
        }

        // 3. APPLY CHANGES POSITIONALLY
        const maxLen = Math.max(originalIds.length, cleaned.length);
        const allTags = await Tag.find().lean();
        const nameToId = {};
        allTags.forEach(t => { nameToId[t.name.toLowerCase()] = String(t._id); });

        for (let i = 0; i < maxLen; i++) {
            const origId = originalIds[i];
            const newName = cleaned[i];
            const requestedColor = (colors && colors[i]) ? String(colors[i]).trim() : null;

            // FIX: If this ID was just deleted, do NOT process it in the loop
            if (origId && deletionSet.has(String(origId))) {
                continue; 
            }

            if (origId && newName) {
                // Update existing
                const updates = { name: newName };
                if (requestedColor) updates.color = requestedColor;
                await Tag.findByIdAndUpdate(origId, updates);
            } else if (!origId && newName) {
                // Create new only if it doesn't exist globally
                const lower = newName.toLowerCase();
                if (!nameToId[lower]) {
                    await Tag.create({ name: newName, color: requestedColor || '#888888' });
                }
            }
        }

        const updated = await Tag.find().sort({ name: 1 }).lean();
        return res.status(200).json({ tags: updated });
    } catch (error) {
        console.error('Error syncing tags:', error);
        return res.status(500).json({ message: 'Failed to sync tags.' });
    }
};

export default { listTags, createTag, syncTags };
