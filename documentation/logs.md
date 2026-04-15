# Logs
The Logs page provides access to three types of log data. It is available at `[Domain]/logs`.

Requires the `view:logs` permission.

## User Logs
User logs track interactions that users have on the site: logging in, creating/modifying/deleting charts, creating reports, changing roles, etc. They provide an audit trail of user activity.

### Event Types
| Event | Description |
|---|---|
| `Login` | User logged in |
| `Logout` | User logged out |
| `Signup` | New user registered |
| `Alert_Created` | Alert definition created |
| `Alert_Modified` | Alert definition updated |
| `Alert_Deleted` | Alert definition removed |
| `Report_Created` | Report generated |
| `Report_Deleted` | Report removed |
| `Chart_Created` | Chart configuration created |
| `Chart_Modified` | Chart configuration updated |
| `Chart_Deleted` | Chart configuration removed |
| `Unspecified_Event` | Fallback for uncategorized events |

User logs can be filtered by user, event type, date range, and search text. They support pagination and can be exported as CSV or PDF.

## AI Logs (Recent Logs)
These are high-fidelity logs generated and stored every second. Each entry contains all metrics from the `DATA_DICTIONARY` (see [Constants Reference](constants.md)) plus a `breakdown` object with per-topic and per-subtopic data.

AI Logs are kept for **1 day** (`AI_LOG_CUTOFF` in `constants/sse.js`). After that, they are deleted. For long-term data, see AI Summaries below.

AI logs can be filtered by model name, date range, and search text. Individual log entries can be viewed in detail and tagged with historical tags.

### Log Tagging
Individual AI log entries can be tagged for organization and tracking. Tags are applied as historical tags (immutable snapshots) so the tag state is preserved even if the original tag is later modified.

## AI Summaries (Long Term Logs)
AI Summaries are created every minute and contain an averaged version of the 60 AI Logs generated over that minute. This allows long-term data storage with reduced volume.

Key differences from AI Logs:
- The `breakdown` object is **removed** from summaries to save storage
- Charts with timeframes longer than 15 minutes use summary data
- Topic/sub-topic splitting is not available for summary-based timeframes

AI summaries can be filtered by model name and date range.

## Exporting Logs
Logs can be exported in two formats:
- **CSV** — comma-separated values for spreadsheet analysis
- **PDF** — formatted document with event details

Export requires the `export:logs` permission.

## Read Next
- [Management](management.md)
- [Errors](errors.md)
