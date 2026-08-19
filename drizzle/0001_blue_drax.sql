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
	`name` varchar(160) NOT NULL,
	`mosqueName` varchar(160) NOT NULL,
	`description` text,
	`level` enum('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
	`teacherId` int NOT NULL,
	`capacity` int NOT NULL DEFAULT 20,
	`meetingSummary` varchar(255) NOT NULL,
	`status` enum('active','paused','completed') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `circles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `directMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderId` int NOT NULL,
	`recipientId` int NOT NULL,
	`body` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	CONSTRAINT `directMessages_id` PRIMARY KEY(`id`)
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
	`type` enum('attendance','progress','points','task','message','general') NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` text NOT NULL,
	`href` varchar(255),
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pointsLedger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`sourceType` enum('attendance','memorization','revision','challenge','manual') NOT NULL,
	`points` int NOT NULL,
	`description` varchar(400) NOT NULL,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pointsLedger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `progressRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`circleId` int NOT NULL,
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
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','teacher','guardian','student') NOT NULL DEFAULT 'student';--> statement-breakpoint
UPDATE `users` SET `role` = 'student' WHERE `role` = 'user';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','teacher','guardian','student') NOT NULL DEFAULT 'student';--> statement-breakpoint
CREATE INDEX `attendance_student_idx` ON `attendanceRecords` (`studentId`);--> statement-breakpoint
CREATE INDEX `circles_teacher_idx` ON `circles` (`teacherId`);--> statement-breakpoint
CREATE INDEX `messages_recipient_read_created_idx` ON `directMessages` (`recipientId`,`isRead`,`createdAt`);--> statement-breakpoint
CREATE INDEX `enrollments_student_idx` ON `enrollments` (`studentId`);--> statement-breakpoint
CREATE INDEX `guardian_links_student_idx` ON `guardianStudentLinks` (`studentId`);--> statement-breakpoint
CREATE INDEX `notifications_recipient_read_created_idx` ON `notifications` (`recipientId`,`isRead`,`createdAt`);--> statement-breakpoint
CREATE INDEX `points_student_created_idx` ON `pointsLedger` (`studentId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `progress_student_recorded_idx` ON `progressRecords` (`studentId`,`recordedAt`);--> statement-breakpoint
CREATE INDEX `progress_circle_recorded_idx` ON `progressRecords` (`circleId`,`recordedAt`);--> statement-breakpoint
CREATE INDEX `sessions_circle_starts_idx` ON `sessions` (`circleId`,`startsAt`);--> statement-breakpoint
CREATE INDEX `tasks_student_status_idx` ON `tasks` (`studentId`,`status`);
