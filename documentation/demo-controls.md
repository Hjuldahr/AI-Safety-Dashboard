# Demo Controls

The demo page allows users to switch AI model behavior in real-time by applying pre-configured scenarios. This is useful for testing, demonstrations, and validating alert rules.

The demo page is available at `[Domain]/demo`.

Requires the `view:demo` permission.

## How It Works

Each AI model can have multiple **scenarios** defined as JSON configuration files in `data_analysis_pipeline/model_configs/`. A scenario changes how the fake data generator produces metrics — for example, a "Rogue" scenario might increase toxicity scores and decrease policy compliance.

The default scenario for all models is `Normal`.

## Using the Demo Page

1. Select a **Model** from the dropdown
2. View the available **Scenarios** for that model
3. Click **Apply** to activate a scenario
4. Click **Reset** to return to the `Normal` scenario

When a scenario is applied or reset, a notification is broadcast to all connected users indicating who made the change.

## Available Scenarios

Scenarios are loaded from JSON files in `data_analysis_pipeline/model_configs/`. The current models and their config files:

| Config File | Model | Scenario |
|---|---|---|
| `good_model_config.json` | GoodModel | Normal |
| `bad_model_config.json` | BadModel | Normal |
| `rogue_good_model_config.json` | GoodModel | Rogue |
| `rogue_bad_model_config.json` | BadModel | Rogue |

## Scenario Configuration

Each scenario config file contains:

- **META** — model name and scenario name
- **TOPIC_WEIGHTS** — probability distribution for topic selection
- **TOPIC_CHARACTERISTICS** — per-topic behavior parameters:
  - `baseTokens` — average tokens per response
  - `tokenVariance` — randomness in token count
  - `toxicityChance` — probability of toxic output
  - `piiChance` — probability of PII leakage
  - `webLookupChance` — probability of web lookups
  - `complexity` — computational complexity multiplier
- **SUBTOPIC_CHARACTERISTICS_MODIFIERS** — per-subtopic overrides
- **MODEL_PROFILE** — model-level behavior:
  - `filterStrength` — how effectively the model filters harmful content
  - `complianceBase` — baseline policy compliance
  - `helpfulnessWhenBlocked` — helpfulness score when content is blocked
  - `tokensWhenBlocked` — tokens used for blocked responses
  - `speedMultiplier` — response time multiplier
- **TOXICITY_PROFILE** — severity distribution and score ranges

## Removing Demo in Production

For production deployments where real AI data is used, the demo system can be removed:

1. Remove or restrict the `view:demo` permission from roles in `constants/roles.js`
2. Optionally remove `routers/demoRouter.js` and `controllers/demoController.js`
3. Remove the demo link from the navigation

See the [AI Integration Guide](ai-integration.md) for full production migration instructions.

## Component Library

A component library page is also available at `[Domain]/demo/components` for viewing UI components in isolation.

## Read Next
- [AI Integration Guide](ai-integration.md)
- [Dashboard](dashboard.md)
