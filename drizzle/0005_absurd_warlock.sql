CREATE TABLE `monarch_node_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nodeId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`action` enum('registered','reviewed','suspended','reactivated') NOT NULL,
	`details` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `monarch_node_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monarch_nodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nodeCode` varchar(24) NOT NULL,
	`nodeLabel` varchar(140) NOT NULL,
	`layer` enum('anchor','relay','signal') NOT NULL,
	`mandate` varchar(280) NOT NULL,
	`regionLabel` varchar(160),
	`capabilityManifestJson` text NOT NULL,
	`status` enum('planned','active','suspended') NOT NULL DEFAULT 'planned',
	`operatorUserId` int,
	`approvedByUserId` int NOT NULL,
	`approvedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewDueAt` timestamp,
	`suspendedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monarch_nodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `monarch_nodes_nodeCode_unique` UNIQUE(`nodeCode`)
);
--> statement-breakpoint
ALTER TABLE `emergency_resources` ADD `nodeId` int;--> statement-breakpoint
ALTER TABLE `services` ADD `nodeId` int;--> statement-breakpoint
ALTER TABLE `monarch_node_audits` ADD CONSTRAINT `monarch_node_audits_nodeId_monarch_nodes_id_fk` FOREIGN KEY (`nodeId`) REFERENCES `monarch_nodes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monarch_node_audits` ADD CONSTRAINT `monarch_node_audits_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monarch_nodes` ADD CONSTRAINT `monarch_nodes_operatorUserId_users_id_fk` FOREIGN KEY (`operatorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monarch_nodes` ADD CONSTRAINT `monarch_nodes_approvedByUserId_users_id_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `monarch_node_audits_node_idx` ON `monarch_node_audits` (`nodeId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `monarch_nodes_code_idx` ON `monarch_nodes` (`nodeCode`);--> statement-breakpoint
CREATE INDEX `monarch_nodes_status_layer_idx` ON `monarch_nodes` (`status`,`layer`);