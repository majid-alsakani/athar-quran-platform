# Weekly report automation

Attendance and progress notifications are created synchronously when a teacher saves a record. The weekly-report design keeps an idempotent report row for each guardian and week so the same report cannot be delivered twice.

The app will expose a deployment-ready scheduled endpoint after the production site is published. The scheduled activation is intentionally separate from local development because recurring jobs must target the public deployment. Until activation, an administrator can generate the same weekly report manually from the dashboard.
