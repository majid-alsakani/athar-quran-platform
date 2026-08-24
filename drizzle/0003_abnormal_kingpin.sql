CREATE TABLE `guardianInvitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`studentId` int NOT NULL,
	`guardianId` int,
	`recipientName` varchar(160) NOT NULL,
	`recipientEmail` varchar(320),
	`recipientPhone` varchar(32),
	`channel` enum('email','whatsapp') NOT NULL,
	`token` varchar(80) NOT NULL,
	`status` enum('draft','queued','sent','failed','accepted','cancelled') NOT NULL DEFAULT 'draft',
	`consentAt` timestamp,
	`sentAt` timestamp,
	`acceptedAt` timestamp,
	`lastError` text,
	`requestedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guardianInvitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `guardianInvitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `organizations` ADD `isDemo` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `guardianInvitations` ADD CONSTRAINT `guardianInvitations_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guardianInvitations` ADD CONSTRAINT `guardianInvitations_studentId_users_id_fk` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guardianInvitations` ADD CONSTRAINT `guardianInvitations_guardianId_users_id_fk` FOREIGN KEY (`guardianId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guardianInvitations` ADD CONSTRAINT `guardianInvitations_requestedById_users_id_fk` FOREIGN KEY (`requestedById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `guardian_invites_org_status_idx` ON `guardianInvitations` (`organizationId`,`status`);--> statement-breakpoint
CREATE INDEX `guardian_invites_student_idx` ON `guardianInvitations` (`studentId`);