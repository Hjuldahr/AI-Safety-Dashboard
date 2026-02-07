import fs from 'fs';

const CONFIG_DIR = new URL('../model_configs/', import.meta.url);

const DEFAULT_SCENARIO = 'Normal';
// registry = {modelName: {scenarioName: {}}}
const registry = {};
// model_scenarios = {modelName: scenarioName}
const model_scenarios = {};

export function setScenario(modelName, scenario) {
  if (!registry[modelName]) {
    throw new Error(`Unsupported model: ${modelName}`);
  }

  if (!registry[modelName][scenario]) {
    throw new Error(
      `Scenario "${scenario}" not found for model "${modelName}"`
    );
  }

  model_scenarios[modelName] = scenario;
}

export function getScenarios(modelName) {
  if (!registry[modelName]) {
    throw new Error(`Unsupported model: ${modelName}`);
  }
  return registry[modelName];
}

export function clearScenario(modelName) {
  if (!registry[modelName]) {
    throw new Error(`Unsupported model: ${modelName}`);
  }

  delete model_scenarios[modelName];
}

// TODO add lazy loader when scaling up models + scenarios
for (const file of fs.readdirSync(CONFIG_DIR)) {
  if (!file.endsWith('.json')) continue;

  const config = JSON.parse(
    fs.readFileSync(new URL(file, CONFIG_DIR), 'utf8')
  );

  const name = config.META?.ModelName;
  if (!name) {
    throw new Error(`Missing META.ModelName in ${file}`);
  }

  const scenario = config.META.Scenario || DEFAULT_SCENARIO;

  if (!registry[name]) {
    registry[name] = {};
  }

  registry[name][scenario] = config;
}

export function getModelConfig(name) {
  if (!registry[name]) {
    throw new Error(`Unsupported model: ${name}`);
  }

  const scenario = model_scenarios[name] || DEFAULT_SCENARIO;

  if (!registry[name][scenario]) {
    throw new Error(
      `Scenario "${scenario}" not found for model "${name}"`
    );
  }

  return registry[name][scenario];
}

export const LOADED_MODELS = Object.keys(registry);