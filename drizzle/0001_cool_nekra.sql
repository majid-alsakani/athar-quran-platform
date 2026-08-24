CREATE TABLE `attendanceRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`studentId` int NOT NULL,
	`status` enum('present','absent','late','excused') NOT NULL,
	`notes` varchar(500),
	`recordedById` int NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendanceRecords_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_session_student_unique` UNIQUE(`sessionId`,`studentId`)
);
--> statement-breakpoint
CREATE TABLE `circles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`teacherId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`mosqueName` varchar(160) NOT NULL,
	`level` enum('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
	`capacity` int NOT NULL DEFAULT 20,
	`meetingSummary` varchar(255) NOT NULL,
	`status` enum('active','paused','completed') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `circles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`circleId` int NOT NULL,
	`studentId` int NOT NULL,
	`status` enum('active','paused','completed','withdrawn') NOT NULL DEFAULT 'active',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `enrollments_id` PRIMARY KEY(`id`),
	CONSTRAINT `enrollments_circle_student_unique` UNIQUE(`circleId`,`studentId`)
);
--> statement-breakpoint
CREATE TABLE `guardianStudentLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guardianId` int NOT NULL,
	`studentId` int NOT NULL,
	`relationship` varchar(64) NOT NULL DEFAULT 'ولي الأمر',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guardianStudentLinks_id` PRIMARY KEY(`id`),
	CONSTRAINT `guardian_student_unique` UNIQUE(`guardianId`,`studentId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientId` int NOT NULL,
	`type` enum('attendance','progress','task','report','general') NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` text NOT NULL,
	`href` varchar(255),
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`city` varchar(120),
	`status` enum('active','paused') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `progressRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`circleId` int NOT NULL,
	`sessionId` int,
	`studentId` int NOT NULL,
	`teacherId` int NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`memorizationFrom` varchar(120),
	`memorizationTo` varchar(120),
	`revisionFrom` varchar(120),
	`revisionTo` varchar(120),
	`tajweedGrade` enum('excellent','very_good','good','needs_support'),
	`notes` text,
	`pointsAwarded` int NOT NULL DEFAULT 0,
	CONSTRAINT `progressRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`circleId` int NOT NULL,
	`teacherId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp,
	`status` enum('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`circleId` int NOT NULL,
	`studentId` int,
	`title` varchar(200) NOT NULL,
	`description` text,
	`taskType` enum('memorization','revision','practice','challenge') NOT NULL,
	`dueAt` timestamp,
	`pointsAvailable` int NOT NULL DEFAULT 0,
	`status` enum('assigned','submitted','completed','overdue') NOT NULL DEFAULT 'assigned',
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weeklyReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`guardianId` int NOT NULL,
	`studentId` int NOT NULL,
	`weekStart` timestamp NOT NULL,
	`summary` text NOT NULL,
	`deliveredAt` timestamp,
	`scheduleCronTaskUid` varchar(65),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weeklyReports_id` PRIMARY KEY(`id`),
	CONSTRAINT `weekly_report_guardian_student_week_unique` UNIQUE(`guardianId`,`studentId`,`weekStart`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','teacher','guardian','student') NOT NULL DEFAULT 'student';--> statement-breakpoint
ALTER TABLE `users` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `attendanceRecords` ADD CONSTRAINT `attendanceRecords_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendanceRecords` ADD CONSTRAINT `attendanceRecords_studentId_users_id_fk` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendanceRecords` ADD CONSTRAINT `attendanceRecords_recordedById_users_id_fk` FOREIGN KEY (`recordedById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `circles` ADD CONSTRAINT `circles_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `circles` ADD CONSTRAINT `circles_teacherId_users_id_fk` FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_circleId_circles_id_fk` FOREIGN KEY (`circleId`) REFERENCES `circles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_studentId_users_id_fk` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guardianStudentLinks` ADD CONSTRAINT `guardianStudentLinks_guardianId_users_id_fk` FOREIGN KEY (`guardianId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guardianStudentLinks` ADD CONSTRAINT `guardianStudentLinks_studentId_users_id_fk` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_recipientId_users_id_fk` FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progressRecords` ADD CONSTRAINT `progressRecords_circleId_circles_id_fk` FOREIGN KEY (`circleId`) REFERENCES `circles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progressRecords` ADD CONSTRAINT `progressRecords_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progressRecords` ADD CONSTRAINT `progressRecords_studentId_users_id_fk` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progressRecords` ADD CONSTRAINT `progressRecords_teacherId_users_id_fk` FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_circleId_circles_id_fk` FOREIGN KEY (`circleId`) REFERENCES `circles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_teacherId_users_id_fk` FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_circleId_circles_id_fk` FOREIGN KEY (`circleId`) REFERENCES `circles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_studentId_users_id_fk` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `weeklyReports` ADD CONSTRAINT `weeklyReports_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `weeklyReports` ADD CONSTRAINT `weeklyReports_guardianId_users_id_fk` FOREIGN KEY (`guardianId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `weeklyReports` ADD CONSTRAINT `weeklyReports_studentId_users_id_fk` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `attendance_student_idx` ON `attendanceRecords` (`studentId`);--> statement-breakpoint
CREATE INDEX `circles_organization_idx` ON `circles` (`organizationId`);--> statement-breakpoint
CREATE INDEX `circles_teacher_idx` ON `circles` (`teacherId`);--> statement-breakpoint
CREATE INDEX `enrollments_student_idx` ON `enrollments` (`studentId`);--> statement-breakpoint
CREATE INDEX `guardian_links_student_idx` ON `guardianStudentLinks` (`studentId`);--> statement-breakpoint
CREATE INDEX `notifications_recipient_read_created_idx` ON `notifications` (`recipientId`,`isRead`,`createdAt`);--> statement-breakpoint
CREATE INDEX `progress_student_recorded_idx` ON `progressRecords` (`studentId`,`recordedAt`);--> statement-breakpoint
CREATE INDEX `progress_circle_recorded_idx` ON `progressRecords` (`circleId`,`recordedAt`);--> statement-breakpoint
CREATE INDEX `sessions_circle_starts_idx` ON `sessions` (`circleId`,`startsAt`);--> statement-breakpoint
CREATE INDEX `tasks_student_status_idx` ON `tasks` (`studentId`,`status`);--> statement-breakpoint
CREATE INDEX `weekly_reports_schedule_uid_idx` ON `weeklyReports` (`scheduleCronTaskUid`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `users_organization_role_idx` ON `users` (`organizationId`,`role`);