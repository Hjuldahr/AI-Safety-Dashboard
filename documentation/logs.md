# Logs
The Logs page is broadly responsible for 3 main things:
1. User Logs
2. AI Logs (Recent Logs)
3. AI Summaries (Long Term Logs)

## User Logs
These track the interactions that users have on the site. Things like logging in, creating, modifying, deleting a chart, creating a report, etc.
They provide a historical view of user's interactions with the site.

## AI Logs
These are the high fidelity logs that are generated and stored every second. Only a certain limit of these logs are kept. Currently that
is 1 days worth of logs. After that the AI Logs are deleted. In order to keep data long term, thats where we turn to the "AI Summaries"

- ToDo: Update this once admins can choose how long to keep logs for.

## AI Summaries
AI Summaries are made every minute and contain a summarized version of the 60 AI Logs that where generated over that minute. This allows us to store less logs, 
while still having a good amount of granularity for report generation.

Additionally, we also remove the "breakdown" object from the AI Log when we turn it into a Summary. This is because the breakdown
object contains much more data than the rest of the object (which it must do so in order to break down the charts by topic or sub topic).
Removing this object has the caveat that we can no longer split our charts by topic or sub topic when we are using AI Summaries - which is charts > 15m timeframe.

## Read Next
- [User Management](user-management.md)
- [Errors](errors.md)