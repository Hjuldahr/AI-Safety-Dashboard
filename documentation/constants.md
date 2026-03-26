# Constants Reference

The `constants/` folder contains shared configuration values used across the server and client. Each file defines a specific domain of constants.

---

## charts.js

Defines all chart-related configuration including the data model, known AI models, topic hierarchy, and timeframe settings.

### `KNOWN_MODELS`
An array of model name strings that the system tracks. These correspond to files in the `ai_models/` folder and config files in `data_analysis_pipeline/model_configs/`.

```js
["GoodModel", "BadModel"]
```

### `TOPIC_HIERARCHY`
A map of top-level topics to their sub-topics. This defines the categorical breakdown used in AI log analysis. Each AI interaction is classified into one of these topics and sub-topics.

| Topic | Sub-Topics |
|---|---|
| Customer Support | Troubleshooting, Returns & Refunds |
| Sales & Inquiry | Product Info, Pricing & Quotes, Comparison, Business Details |
| General Use | Conversation, Programming, School Work |

### `CHART_SIZES`
Available size options for dashboard charts.

| Key | Label |
|---|---|
| `tiny` | Tiny |
| `regular` | Regular |
| `large` | Large |
| `massive` | Massive |

### `TIMEFRAME_CONFIG`
Defines the available time windows for chart data. Each timeframe specifies which database model to query, the time range, bucket size, and data point limit.

Timeframes using `AI_Log` (high fidelity, per-second data):

| Key | Time Range | Bucket Size | Max Points |
|---|---|---|---|
| `10s` | 10 seconds | 1 second | 10 |
| `30s` | 30 seconds | 1 second | 30 |
| `1min` | 1 minute | 1 second | 60 |
| `5min` | 5 minutes | 5 seconds | 60 |
| `15min` | 15 minutes | 15 seconds | 60 |

Timeframes using `AI_Summary` (low fidelity, per-minute data):

| Key | Time Range | Bucket Size | Max Points |
|---|---|---|---|
| `1h` | 1 hour | 1 minute | 60 |
| `1d` | 1 day | 10 minutes | 144 |
| `1w` | 1 week | 1 hour | 168 |
| `1mo` | 1 month | 6 hours | 120 |

### `ZOOM_LEVELS`
An ordered array of timeframe keys sorted by time range (smallest to largest). Used by the chart zoom controls to step between timeframes.

### `DATA_DICTIONARY`
The central schema definition for all metrics tracked by the system. Each entry defines a metric's label, database path, data type, summarization strategy, and display color.

#### Categorical Fields (Dimensions)

| Key | Label | Data Type | Summarize | Description |
|---|---|---|---|---|
| `modelName` | Model Name | categorical | special | The AI model that generated the data. Accepted values come from `KNOWN_MODELS`. |
| `topic` | Topic | categorical | remove | The top-level topic category. Removed during summarization (not stored in `AI_Summary`). |
| `sub_topic` | Sub Topic | categorical | remove | The sub-topic category. Also removed during summarization. |

#### Numeric Fields (Metrics)

| Key | Label | Data Type | Summarize | Description |
|---|---|---|---|---|
| `policyCompliance` | Policy Compliance (%) | numeric | avg | Percentage of responses that comply with safety policies. Range: 0-100. |
| `responseHelpfulness` | Response Helpfulness (1-5) | numeric | avg | Average helpfulness rating on a 1-5 scale. |
| `responseTime` | Response Time (ms) | numeric | avg | Average response latency in milliseconds. |
| `energyConsumption` | Energy Consumption (J) | numeric | sum | Total energy consumed in joules. |
| `tokensUsed` | LLM Tokens Used | numeric | sum | Total tokens consumed by the LLM. |
| `gigaFlopsUsed` | Operations (GFLOPs) | numeric | sum | Total compute operations in gigaflops. |
| `webLookups` | Internet Lookups | numeric | sum | Number of external web lookups performed. |
| `toxicityScore` | Toxicity Score (0-1) | numeric | avg | Average toxicity score. 0 = safe, 1 = highly toxic. |
| `piiDetected` | PII Detected (%) | numeric | avg | Percentage of responses containing personally identifiable information. |
| `queryCount` | Query Count | numeric | sum | Total number of queries processed. |
| `flaggedCount` | Flagged Call Count | numeric | sum | Number of calls flagged for review. |

#### Special Fields

| Key | Label | Data Type | Description |
|---|---|---|---|
| `responseTimestamp` | Timestamp | timestamp | Unix timestamp of when the data was recorded. |
| `flaggedOutputs` | Flagged Outputs | flaggedOutputs | Object containing details of flagged AI outputs. |

The `summarize` field determines how the metric is aggregated when creating `AI_Summary` records:
- `avg` — averaged over the summary period
- `sum` — summed over the summary period
- `remove` — excluded from summaries (topic/sub-topic breakdowns)
- `special` — handled with custom logic

---

## notification.js

Defines constants for the notification system.

### `NOTIFICATION_TYPES`
A frozen object of valid notification categories:

| Type | Description |
|---|---|
| `Generic` | General-purpose notifications |
| `Alert` | Alert-triggered notifications |
| `Demo` | Notifications from demo scenario changes |
| `Server` | Server lifecycle events (pause, resume, shutdown) |
| `Unknown` | Fallback for unrecognized types |

### `TRIM_COLOURS`
Maps severity levels and server states to CSS color values used for the notification border/trim:

| Key | Color |
|---|---|
| `Critical` | `var(--color-critical)` |
| `High` | `var(--color-high)` |
| `Medium` | `var(--color-medium)` |
| `Info` | `var(--color-info)` |
| `Shutdown` | `#cc0202` |
| `Paused` | `#f45b69` |
| `Resumed` | `#2ca58d` |

### `BACKGROUND_COLOURS`
Maps the same keys to lighter background colors for notification cards.

### `SHUTDOWN_MESSAGE`
A pre-built notification object broadcast when the server shuts down. It is non-dismissible and has no timeout.

---

## permissions.js

Defines all granular permissions in the system, grouped by feature area.

### Permission Groups

#### Common
| Permission | Description |
|---|---|
| `view:profile` | View own profile |
| `edit:profile` | Edit own profile |

#### Dashboard
| Permission | Description |
|---|---|
| `view:dashboard` | View dashboard |
| `create:graph` | Create dashboard graph |
| `edit:graph` | Edit dashboard graph |
| `delete:graph` | Delete dashboard graphs |

#### Alerts
| Permission | Description |
|---|---|
| `view:alerts` | View alerts |
| `create:alert` | Create alerts |
| `edit:alert` | Edit alerts |
| `delete:alert` | Delete alerts |
| `acknowledge:alert` | Acknowledge alerts |
| `manage:alert_rules` | Manage alert rules |

#### Reports
| Permission | Description |
|---|---|
| `view:reports` | View reports |
| `create:report` | Create reports |
| `edit:report` | Edit reports |
| `delete:report` | Delete reports |
| `export:report` | Export reports |

#### Logs
| Permission | Description |
|---|---|
| `view:logs` | View logs |
| `export:logs` | Export logs |
| `clear:logs` | Clear logs |

#### Admin
| Permission | Description |
|---|---|
| `manage:users` | Manage users |
| `manage:roles` | Manage roles |
| `view:system` | View system settings |
| `edit:system` | Edit system settings |

#### Documentation
| Permission | Description |
|---|---|
| `read:docs` | Read the documentation |

#### Demo
| Permission | Description |
|---|---|
| `view:demo` | View demo page |

---

## roles.js

Defines the built-in roles and their assigned permissions. Roles are hierarchical — higher roles include more permissions.

| Role | Description | Permissions |
|---|---|---|
| `owner` | Full system access | All permissions from every group |
| `admin` | Administrative access | All dashboard, alerts, reports, logs, admin, common, documentation, and demo permissions |
| `user` | Standard user access | View/create/edit dashboard, view/create/acknowledge alerts, view/create reports, view logs, read docs, common |
| `viewer` | Read-only access | View dashboard, view alerts, view reports, view logs, read docs, common |
| `visitor` | Limited public access | View dashboard, view profile, read docs |

Custom roles can also be created through the admin panel and are stored in the database.

---

## sse.js

Defines constants for the Server-Sent Events (SSE) scheduler that drives real-time data generation.

| Constant | Value | Description |
|---|---|---|
| `HEARTBEAT` | `15000` (15s) | Interval for SSE keepalive pings to prevent connection timeout |
| `SCHEDULER_INTERVAL` | `1000` (1s) | How often the scheduler generates new AI log data |
| `SUMMARY_INTERVAL` | `60000` (1min) | How often AI Logs are summarized into AI Summaries |
| `AI_LOG_CUTOFF` | `86400000` (1 day) | AI Logs older than this are deleted (summaries are kept) |
| `ALERTS_COOLDOWN` | `0` | Minimum time between alert triggers (0 = no cooldown) |
| `AI_MODELS` | `["GoodModel", "BadModel"]` | Which models the scheduler generates data for |

## Read Next
- [Development Environment](development-environment.md)
- [AI Integration Guide](ai-integration.md)
