# Weekly report automation

Attendance and progress notifications are created synchronously when a teacher saves a record. The weekly-report design keeps an idempotent report row for each guardian and week, a separate delivery ledger per report/channel/recipient, and a storage key for the server-generated Arabic PDF. The PDF bytes remain in protected object storage; the database never stores the document itself.

The scheduled endpoint authenticates the scheduler identity and looks up the schedule by its trusted task UID, never by a request-body field. It returns a successful skip for orphaned or paused schedules and uses the report/delivery uniqueness rules to remain safe when retries occur.

External delivery has a deliberate safety gate. The system requires an invitation whose token was accepted by a logged-in guardian and whose consent timestamp was recorded. It then creates a queued delivery record. At present, the channel adapter returns `not_configured` and performs no network request because no email or WhatsApp provider has been selected or configured. The queue remains visible to administrators, and `weeklyReports.deliveredAt` is set only after a real provider reports successful dispatch.

The app will expose a deployment-ready scheduled endpoint after the production site is published. Scheduled activation is intentionally separate from local development because recurring jobs must target the public deployment. After publishing, an administrator may activate an eligible guardian/student pair from the dashboard; until then, the same report can be generated manually for in-app viewing and PDF verification.
