# Roles and data boundaries

## Administrator

The administrator manages the organization, users, circles, sessions, and exports. Every administrator query is constrained to their assigned organization.

## Teacher

The teacher can see only circles assigned to their account, enrolled students in those circles, and sessions that they own. Teachers can record attendance and progress only for enrolled students.

## Guardian

The guardian can see only student records linked through the guardian-student relationship. Guardian dashboards never expose circle rosters, teacher data, or another student's records.

## Student

The student can see only their own tasks, attendance, progress, and notifications.

## Enforcement

All protected backend procedures resolve the signed-in user first and apply organization, circle, enrollment, or guardian-link filters at the database boundary. The client interface is never used as the source of authorization.
