CREATE TABLE `registry_changes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snapshotId` int NOT NULL,
	`changeType` enum('added','removed') NOT NULL,
	`regNo` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`prefecture` varchar(16),
	`regDate` varchar(16),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `registry_changes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `registry_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`baseDate` varchar(16) NOT NULL,
	`totalCount` int NOT NULL,
	`sourceUrl` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `registry_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `registry_snapshots_baseDate_unique` UNIQUE(`baseDate`)
);
--> statement-breakpoint
ALTER TABLE `proposals` MODIFY COLUMN `content` mediumtext;--> statement-breakpoint
ALTER TABLE `consultations` ADD `consented_at` timestamp;--> statement-breakpoint
ALTER TABLE `plan_applications` ADD `consented_at` timestamp;