# Alerts

The alerts system allows users to define rules that trigger when AI metrics cross specified thresholds. When an alert fires, it creates an alert log entry and sends a real-time notification.

The alerts page is available at `[Domain]/alerts`.

## Creating an Alert

To create an alert, you need:

- **Alert Name** — a descriptive name for the alert
- **Alert Level** — severity level: `Critical`, `High`, `Medium`, or `Info`
- **Model Name** — (optional) target a specific AI model, or leave blank to apply to all models
- **Alert Rule** — a MongoDB-style query object that defines the trigger condition

Example alert rule that fires when toxicity exceeds 0.7:
```json
{
    "toxicityScore": { "$gt": 0.7 }
}
```

Alerts are created via the UI modal or the `POST /alerts` API endpoint.

## Alert Rules

Alert rules use MongoDB query syntax to evaluate against incoming `AI_Log` data. Supported operators include:

| Operator | Description | Example |
|---|---|---|
| `$gt` | Greater than | `{ "toxicityScore": { "$gt": 0.5 } }` |
| `$gte` | Greater than or equal | `{ "piiDetected": { "$gte": 50 } }` |
| `$lt` | Less than | `{ "policyCompliance": { "$lt": 80 } }` |
| `$lte` | Less than or equal | `{ "responseHelpfulness": { "$lte": 2 } }` |
| `$eq` | Equal to | `{ "queryCount": { "$eq": 0 } }` |

Rules are evaluated every second by the alert evaluator (`server_side_events/alertEvaluator.js`) against the latest AI log data.

## Alert Levels

| Level | Description | Color |
|---|---|---|
| Critical | Immediate attention required | Red |
| High | Significant issue detected | Orange |
| Medium | Notable but not urgent | Yellow |
| Info | Informational notification | Blue |

## Alert History

The alert history shows a paginated log of all triggered alerts. Each entry includes:
- The alert name and level
- The model that triggered it
- A snapshot of the alert configuration at the time of triggering
- The timestamp of when it fired

History can be filtered by:
- Model name
- Alert level
- Date range

Access alert history via the UI or `GET /alerts/api/history`.

## Alert Tagging

Alerts can be tagged with user-created tags for organization and filtering. Tags are color-coded and can be managed from the alerts page.

When an alert fires, any tags associated with the alert definition are copied as historical tags and attached to the alert log entry. This preserves the tag state at the time of triggering, even if the tag is later renamed or deleted.

## Alert Cooldown

The `ALERTS_COOLDOWN` constant in `constants/sse.js` controls the minimum time between consecutive triggers of the same alert. This prevents alert flooding. Currently set to `0` (no cooldown).

## Read Next
- [Reports](reports.md)
- [Logs](logs.md)
