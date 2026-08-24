CREATE TABLE `weeklyReportSchedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`guardianId` int NOT NULL,
	`studentId` int NOT NULL,
	`cron` varchar(64) NOT NULL DEFAULT '0 0 16 * * 5',
	`isEnabled` boolean NOT NULL DEFAULT true,
	`scheduleCronTaskUid` varchar(65),
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weeklyReportSchedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `weekly_schedule_guardian_student_unique` UNIQUE(`guardianId`,`studentId`)
);
--> statement-breakpoint
ALTER TABLE `weeklyReportSchedules` ADD CONSTRAINT `weeklyReportSchedules_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `weeklyReportSchedules` ADD CONSTRAINT `weeklyReportSchedules_guardianId_users_id_fk` FOREIGN KEY (`guardianId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `weeklyReportSchedules` ADD CONSTRAINT `weeklyReportSchedules_studentId_users_id_fk` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `weeklyReportSchedules` ADD CONSTRAINT `weeklyReportSchedules_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `weekly_schedule_task_uid_idx` ON `weeklyReportSchedules` (`scheduleCronTaskUid`);