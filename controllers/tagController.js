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
        if (!name || !name.trim()) return res.status(400).json({ message: 'Missing tag name.' });
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
        const { originalIds, newNames } = req.body;
        if (!Array.isArray(originalIds) || !Array.isArray(newNames)) return res.status(400).json({ message: 'originalIds and newNames must be arrays' });

        // Normalize names
        const cleaned = newNames.map(n => (n && String(n).trim()) || '');
        // Reject empty names
        if (cleaned.some(n => n === '')) return res.status(400).json({ message: 'Tag names cannot be empty' });

        // Check for duplicate names (case-insensitive)
        const lowered = cleaned.map(n => n.toLowerCase());
        const dupIndex = lowered.findIndex((v, i) => lowered.indexOf(v) !== i);
        if (dupIndex !== -1) return res.status(400).json({ message: 'Tag names must be unique' });

        // Fetch existing tags by originalIds
        const existingTags = await Tag.find({ _id: { $in: originalIds } }).lean();
        const existingById = {};
        existingTags.forEach(t => { existingById[String(t._id)] = t; });

        // Palette for auto colors
        const PALETTE = ['#8888FF','#FF8888','#88FF88','#FFCC66','#66CCFF','#CC66FF','#FF66A3','#66FFCC','#FFD166'];
        const allExistingColors = new Set((await Tag.find().lean()).map(t=>t.color).filter(Boolean));

        const pickColor = () => {
            for (const c of PALETTE) if (!allExistingColors.has(c)) { allExistingColors.add(c); return c; }
            // fallback random
            const rand = '#'+Math.floor(Math.random()*16777215).toString(16).padStart(6,'0');
            allExistingColors.add(rand);
            return rand;
        };

        // Build a map of existing names lower->id for global uniqueness checks
        const allTags = await Tag.find().lean();
        const nameToId = {};
        allTags.forEach(t => { nameToId[t.name.toLowerCase()] = String(t._id); });

        // Validate that no new name collides with an unrelated existing tag
        for (let i = 0; i < cleaned.length; i++) {
            const newName = cleaned[i];
            const existingId = originalIds[i];
            const lower = newName.toLowerCase();
            if (nameToId[lower] && nameToId[lower] !== String(existingId)) {
                return res.status(400).json({ message: `Tag name "${newName}" conflicts with existing tag` });
            }
        }

        // Apply changes positionally
        const maxLen = Math.max(originalIds.length, cleaned.length);
        const mongoose = (await import('mongoose')).default;
        const Alert = (await import('../models/alert_model.js')).default;
        const AlertLog = (await import('../models/alert_log.js')).default;

        for (let i = 0; i < maxLen; i++) {
            const origId = originalIds[i];
            const newName = cleaned[i];
            if (origId && newName) {
                // rename if changed
                const existing = existingById[String(origId)];
                if (existing && existing.name !== newName) {
                    await Tag.findByIdAndUpdate(origId, { name: newName }, { new: true });
                }
            } else if (!origId && newName) {
                // create new tag
                // check again unique
                const lower = newName.toLowerCase();
                if (nameToId[lower]) {
                    // should have been caught earlier
                    continue;
                }
                const color = pickColor();
                const created = await Tag.create({ name: newName, color });
                // add to nameToId map
                nameToId[created.name.toLowerCase()] = String(created._id);
            } else if (origId && !newName) {
                // delete tag
                const idToDelete = origId;
                // remove references from Alerts
                await Alert.updateMany({ tags: idToDelete }, { $pull: { tags: mongoose.Types.ObjectId(idToDelete) } });
                // remove references from AlertLog.tags
                await AlertLog.updateMany({ tags: idToDelete }, { $pull: { tags: mongoose.Types.ObjectId(idToDelete) } });
                // remove from snapshot tags arrays
                await AlertLog.updateMany({ 'alertSnapshot.tags._id': mongoose.Types.ObjectId(idToDelete) }, { $pull: { 'alertSnapshot.tags': { _id: mongoose.Types.ObjectId(idToDelete) } } });
                await Tag.findByIdAndDelete(idToDelete);
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
