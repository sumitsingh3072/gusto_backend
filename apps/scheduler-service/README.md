# scheduler-service

Owns the `scheduler` schema (`schedule_config`). Fires the daily lifecycle
per staggered user cohort: T-2h Scout run, T-1h "Menu of the Day"
notification, T-30m final cart population. Drives orchestrator-service via
direct synchronous calls (not events) since timing precision matters here.

Calls: orchestrator-service
