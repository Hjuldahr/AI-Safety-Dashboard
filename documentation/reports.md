# Reports

The reports page lets you generate PDF reports, export raw data in multiple formats, manage report history, and save reusable report templates.

The reports page is available at `[Domain]/reports`.

## Generating a PDF Report

To generate a report:
1. Select a **Template** (optional) or manually configure fields
2. Enter a **Report Title**
3. Select a **Model Name** (or leave blank for all models)
4. Choose a **Start Date** and **End Date**
5. Pick the **metrics/fields** to include
6. Click Generate

The system will:
1. Determine data fidelity based on the selected timeframe vs. the AI log retention cutoff
2. Query `AI_Log` and/or `AI_Summary` collections accordingly
3. Calculate aggregated statistics (min, max, average) per metric
4. Generate time-series chart images using Chart.js
5. Render the report as a PDF via Puppeteer (headless Chromium)
6. Save the PDF to disk and create a `ReportRecord` entry for history

The PDF includes:
- Report title, date range, model, and fidelity info
- Aggregated statistics table (min, max, avg) per selected metric, with links to the source log and any triggered alerts
- Time-series charts for each selected metric
- Optional appendix sections (flagged outputs, raw AI logs, AI summaries, user logs, alert logs)

## Data Fidelity

Reports automatically select the right data source based on the timeframe:

| Fidelity | Condition | Data Source |
|---|---|---|
| `high` | Entire range is within the retention window | `AI_Log` (raw logs) |
| `low` | Entire range is outside the retention window | `AI_Summary` (1-min summaries) |
| `split` | Range spans the retention cutoff | Both — merged with weighted averages |

In `split` mode, time-series data from both sources is aligned to the same bucket intervals, with high-fidelity data taking precedence where available.

## Report Metrics

Any numeric metric from the `DATA_DICTIONARY` can be included in a report:
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

Each metric shows: minimum, maximum, and average (or sum, depending on the metric's `summarize` setting).

## Appendix Sections

The following optional sections can be added to a report:

- `flaggedOutputs` — Flagged output entries from AI logs, sorted newest to oldest
- `appendixAiLogs` — Up to 200 raw AI log entries for the selected range
- `appendixAiSummaries` — Up to 200 AI summary entries for the selected range
- `appendixUserLogs` — Up to 200 user activity log entries for the selected range
- `appendixAlertLogs` — Up to 200 alert log entries for the selected range

## Data Exports

All exports accept `modelName`, `startDate`, and `endDate` in the request body.

| Format | Endpoint | Description |
|---|---|---|
| AI Logs CSV | `POST /reports/download-logs` | Raw `AI_Log` entries, columns driven by `DATA_DICTIONARY` |
| AI Summaries CSV | `POST /reports/download-summaries` | Raw `AI_Summary` entries |
| Aggregates CSV | `POST /reports/download-aggregates` | Min/max/avg table for all numeric metrics |
| HDF5 | `POST /reports/download-hdf5` | All logs and summaries in a structured HDF5 file with separate groups |

The CSV column headers and HDF5 dataset names are generated dynamically from the `DATA_DICTIONARY`, so new metrics are included automatically.

## Report History

Generated reports are saved and accessible from the history panel.

| Action | Endpoint |
|---|---|
| List history (paginated) | `GET /reports/history?page=1&limit=10` |
| View stored PDF | `GET /reports/history/:id/pdf` |
| Re-download export from history | `GET /reports/history/:id/download/:type` |
| Delete report | `DELETE /reports/history/:id` |

Valid `:type` values for re-download: `logs`, `summaries`, `aggregates`, `hdf5`.

## Report Templates

Templates save a named set of fields so you can quickly re-run common reports.

| Action | Endpoint |
|---|---|
| List templates | `GET /reports/templates` |
| Create template | `POST /reports/templates` |
| Delete template | `DELETE /reports/templates/:id` |

A template requires a `name` and at least one `fields` entry. An optional `icon` string can also be provided.

## Permissions

| Permission | Required For |
|---|---|
| `view:reports` | Viewing the page, history, and templates |
| `create:report` | Generating PDFs, creating/deleting templates, deleting history |
| `export:report` | All CSV and HDF5 downloads |

## Read Next
- [Logs](logs.md)
- [Dashboard](dashboard.md)
- [Alerts](alerts.md)
