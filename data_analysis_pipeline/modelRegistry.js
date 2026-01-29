import fs from 'fs';

const CONFIG_DIR = new URL('./model_configs/', import.meta.url);

const registry = {};


// Replace with lazy loader if many models are added later
for (const file of fs.readdirSync(CONFIG_DIR)) {
  if (!file.endsWith('.json')) continue;

  const config = JSON.parse(
    fs.readFileSync(new URL(file, CONFIG_DIR))
  );

  const name = config.META?.ModelName;
  
  if (!name) {
    throw new Error(`Missing Meta.ModelName in ${file}`);
  }

  registry[name] = config;
}

export function getModelConfig(name) {
  if (!registry[name]) {
    throw new Error(`Unsupported model: ${name}`);
  }
  return registry[name];
}

export const LOADED_MODELS = Object.keys(registry);