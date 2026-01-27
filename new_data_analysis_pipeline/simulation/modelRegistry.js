import fs from 'fs';
import path from 'path';

const CONFIG_DIR = new URL('../model_configs/', import.meta.url);

const registry = {};

for (const file of fs.readdirSync(CONFIG_DIR)) {
  if (!file.endsWith('.json')) continue;

  const config = JSON.parse(
    fs.readFileSync(new URL(file, CONFIG_DIR))
  );

  const name = config.META?.ModelName;
  if (!name) throw new Error(`Missing ModelName in ${file}`);

  registry[name] = config;
}

export function getModelConfig(name) {
  if (!registry[name]) {
    throw new Error(`Unsupported model: ${name}`);
  }
  return registry[name];
}

export const SUPPORTED_MODELS = Object.keys(registry);