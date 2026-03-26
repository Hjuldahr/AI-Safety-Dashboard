# Dashboard
The dashboard is the main page of the application. It is the index page and the place where users spend the most time watching real-time AI metrics.

It can be found at:
- Production: `https://danielbierman.ca/dashboard/`
- Development: `http://localhost:2121/`

## Dashboard Controls

The control panel (accessible from the dashboard) allows users to:
- **Pause/Resume** the data scheduler — stops or starts real-time data generation
- **Create new charts** — add custom chart configurations to the dashboard
- **Edit existing charts** — modify chart title, size, type, and data bindings
- **Delete charts** — remove charts from the dashboard
- **Reorder charts** — drag and drop to rearrange chart positions

## Chart Types

The dashboard supports four chart types:

| Type | Description |
|---|---|
| `line` | Time-series line chart. Best for tracking metrics over time. |
| `bar` | Bar chart. Good for comparing values across categories. |
| `pie` | Pie chart. Shows proportional distribution of a metric. |
| `measure` | Single-value gauge. Displays the current value of a metric. |

## Chart Configuration

Each chart is configured with:
- **Title** — display name for the chart
- **Chart Type** — line, bar, pie, or measure
- **Chart Size** — Tiny, Regular, Large, or Massive
- **Y-Axis** — the metric to display (from the `DATA_DICTIONARY`)
- **X-Axis** — typically time (responseTimestamp)
- **Category** — optional grouping dimension (modelName, topic, sub_topic)
- **Split By** — optional secondary dimension to split data series
- **Included Values** — filter which values to include when splitting
- **Timeframe** — the time window for data (10s to 1mo)

## Model Name, Topic, and Sub-Topic

Charts can be filtered and split by three categorical dimensions:

- **Model Name** — which AI model's data to display (e.g., GoodModel, BadModel)
- **Topic** — top-level category of the AI interaction (e.g., Customer Support, Sales & Inquiry, General Use)
- **Sub-Topic** — more specific category within a topic (e.g., Troubleshooting, Programming)

When a chart is split by topic or sub-topic, each category gets its own data series with a distinct color.

> **Note:** Topic and sub-topic splitting is only available for timeframes of 15 minutes or less. Longer timeframes use `AI_Summary` data which does not include the breakdown object.

## Chart Values

All available chart metrics are defined in the `DATA_DICTIONARY` (see [Constants Reference](constants.md)). Key metrics include:

- Policy Compliance (%)
- Response Helpfulness (1-5)
- Response Time (ms)
- Energy Consumption (J)
- LLM Tokens Used
- Operations (GFLOPs)
- Internet Lookups
- Toxicity Score (0-1)
- PII Detected (%)
- Query Count
- Flagged Call Count

## Chart Zoom

Charts support zooming through the available timeframes. The zoom levels progress from smallest to largest:

`10s → 30s → 1min → 5min → 15min → 1h → 1d → 1w → 1mo`

Zooming in shows higher-fidelity data (per-second from `AI_Log`), while zooming out shows aggregated data (per-minute from `AI_Summary`).

## Chart Re-Ordering

Charts can be reordered by dragging and dropping them on the dashboard. The new order is saved via the `/api/reorder` endpoint and persists across sessions.

## Real-Time Updates

The dashboard connects to the server via Server-Sent Events (SSE) at `/events`. Every second, the server broadcasts new AI log data which the charts consume and render in real-time.

## Read Next
- [Alerts](alerts.md)
- [Reports](reports.md)
