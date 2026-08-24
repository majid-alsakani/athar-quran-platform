CREATE TABLE `reportDeliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`weeklyReportId` int NOT NULL,
	`organizationId` int NOT NULL,
	`guardianId` int NOT NULL,
	`studentId` int NOT NULL,
	`channel` enum('email','whatsapp','in_app') NOT NULL,
	`recipient` varchar(320) NOT NULL,
	`status` enum('queued','sent','failed','skipped') NOT NULL DEFAULT 'queued',
	`pdfStorageKey` varchar(512),
	`providerMessageId` varchar(160),
	`attemptCount` int NOT NULL DEFAULT 0,
	`lastError` text,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reportDeliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `report_delivery_report_channel_recipient_unique` UNIQUE(`weeklyReportId`,`channel`,`recipient`)
);
--> statement-breakpoint
ALTER TABLE `guardianInvitations` MODIFY COLUMN `status` enum('draft','queued','sent','failed','accepted','cancelled','expired') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `guardianInvitations` ADD `recipientNormalized` varchar(320);--> statement-breakpoint
ALTER TABLE `guardianInvitations` ADD `expiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `guardianInvitations` ADD `providerMessageId` varchar(160);--> statement-breakpoint
UPDATE `guardianInvitations`
SET `recipientNormalized` = CASE
  WHEN `channel` = 'email' THEN LOWER(TRIM(COALESCE(`recipientEmail`, '')))
  ELSE REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(`recipientPhone`, ''), ' ', ''), '-', ''), '(', ''), ')', '')
END,
`expiresAt` = DATE_ADD(`createdAt`, INTERVAL 7 DAY);--> statement-breakpoint
ALTER TABLE `guardianInvitations` MODIFY COLUMN `recipientNormalized` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `guardianInvitations` MODIFY COLUMN `expiresAt` timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE `weeklyReports` ADD `pdfStorageKey` varchar(512);--> statement-breakpoint
ALTER TABLE `weeklyReports` ADD `generatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `reportDeliveries` ADD CONSTRAINT `reportDeliveries_weeklyReportId_weeklyReports_id_fk` FOREIGN KEY (`weeklyReportId`) REFERENCES `weeklyReports`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reportDeliveries` ADD CONSTRAINT `reportDeliveries_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reportDeliveries` ADD CONSTRAINT `reportDeliveries_guardianId_users_id_fk` FOREIGN KEY (`guardianId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reportDeliveries` ADD CONSTRAINT `reportDeliveries_studentId_users_id_fk` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `report_deliveries_guardian_status_idx` ON `reportDeliveries` (`guardianId`,`status`);--> statement-breakpoint
CREATE INDEX `guardian_invites_recipient_idx` ON `guardianInvitations` (`organizationId`,`channel`,`recipientNormalized`);
