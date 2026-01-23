/* controllers/motdController.js */
import { broadcastEvent } from "../server_side_events/scheduler.js";
import { readFile } from "fs/promises";

const filePath = "devlogs/current_motd.json";

async function readJsonFile() {
    try {
        const jsonString = await readFile(filePath, 'utf8');
        return JSON.parse(jsonString);
    } catch (err) {
        console.error('Error handling file:', err);
        return {};
    }
}

const pullMessage = async (req, res) => {
    try {
        const motd_json = await readJsonFile()
        return res.status(200).json(motd_json);
    } catch (error) {
        console.error("Error fetching motd:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const pushMessage = async (req, res) => {
    try {
        const json = req.body;
        // If request has no body
        if (!json || Object.keys(json).length === 0) {
            const motd_json = await readJsonFile()
            broadcastEvent("motd", motd_json);
            return res.status(200).json({ message: "Broadcasted default MOTD" });
        }

        // Validate required fields
        if ("message" in json && "redirect_url" in json) {
            broadcastEvent("motd", json);
            return res.status(200).json({ message: "Broadcasted custom MOTD" });
        }

        // Invalid request
        return res.status(400).json({ error: "Missing required fields: message and redirect_url" });
    } catch (error) {
        console.error("Error pushing motd:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const readMore = async (req, res) => {
    const json = req.body;
    res.redirect(json.redirect_url);
};

export default {
  pullMessage,
  pushMessage,
  readMore
};