/* controllers/motdController.js */
import { broadcastEvent } from "../server_side_events/scheduler.js";
import { readFile } from "fs/promises";

const filePath = "cms/current_motd.json";

async function readJsonFile() {
  try {
    const jsonString = await readFile(filePath, "utf8");
    return JSON.parse(jsonString);
  } catch (err) {
    console.error('Error handling file:', err);
    return {};
  }
}

export async function broadcastMotd(json) {
  broadcastEvent("motd", json);
}

export async function getMotdJson() {
  return await readJsonFile();
}

const pullMessage = async (req, res) => {
  const motd_json = await getMotdJson();
  res.status(200).json(motd_json);
};

const pushMessage = async (req, res) => {
  const json = req.body;
  const motd_json = await getMotdJson();

  if (!json || Object.keys(json).length === 0) {
    await broadcastMotd(motd_json);
    return res.status(200).json({ message: "Broadcasted default MOTD" });
  }

  if ("message" in json) {
    await broadcastMotd(json);
    return res.status(200).json({ message: "Broadcasted custom MOTD" });
  }

  return res.status(400).json({ error: "Missing required fields: message" });
};

export default {
  pullMessage,
  pushMessage
};
