CREATE TABLE `operator_intake_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`intakeId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`action` enum('approved','declined') NOT NULL,
	`decisionNote` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operator_intake_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `operator_intake_audits` ADD CONSTRAINT `operator_intake_audits_intakeId_operator_intakes_id_fk` FOREIGN KEY (`intakeId`) REFERENCES `operator_intakes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operator_intake_audits` ADD CONSTRAINT `operator_intake_audits_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `operator_intake_audits_intake_idx` ON `operator_intake_audits` (`intakeId`,`createdAt`);