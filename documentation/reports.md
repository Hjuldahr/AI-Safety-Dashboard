# Reports

The reports page allows users to generate PDF reports and export raw data as CSV files. Reports aggregate AI metrics over a specified time range and model.

The reports page is available at `[Domain]/reports`.

## Generating a PDF Report

To generate a report:
1. Enter a **Report Title**
2. Select a **Model Name** (or leave blank for all models)
3. Choose a **Start Date** and **End Date**
4. Click Generate

The system will:
1. Query `AI_Summary` data for the selected range
2. Calculate aggregated statistics (min, max, mean, median, std deviation)
3. Generate time-series data for trend visualization
4. Render the report as a PDF using Puppeteer (headless Chromium)

The PDF includes:
- Report title and date range
- Aggregated statistics table for all numeric metrics
- Time-series charts showing metric trends

## Types of Reports

### PDF Report
Generated via `POST /reports`. Contains formatted statistics and charts rendered server-side using Puppeteer.

### Raw Data CSV
Download via `POST /reports/download-csv`. Exports the raw `AI_Summary` log entries as a CSV file for the selected model and date range.

### Aggregated Statistics CSV
Download via `POST /reports/download-aggregates`. Exports calculated aggregate statistics (min, max, mean, median, standard deviation) for each metric.

## Report Metrics

Reports include aggregated statistics for all numeric metrics defined in the `DATA_DICTIONARY`:
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

Each metric shows: minimum, maximum, mean, median, and standard deviation.

## Read Next
- [Logs](logs.md)
- [Dashboard](dashboard.md)
