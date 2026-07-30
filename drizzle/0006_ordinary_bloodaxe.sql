CREATE TABLE `kanri_orgs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`managementId` varchar(16) NOT NULL,
	`name` varchar(255) NOT NULL,
	`prefecture` varchar(16),
	`address` text,
	`phone` varchar(32),
	`permitType` enum('general','specific') NOT NULL,
	`permitDate` varchar(16),
	`permitExpiry` varchar(16),
	`receiveCountries` text,
	`jobCodes` json,
	`kaigoSupport` boolean DEFAULT false,
	`migrationStatus` enum('unconfirmed','preparing','applying','permitted','not_migrating') NOT NULL DEFAULT 'unconfirmed',
	`statusConfirmedAt` varchar(16),
	`statusNote` text,
	`isVerified` boolean DEFAULT false,
	`verifiedAt` varchar(16),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kanri_orgs_id` PRIMARY KEY(`id`),
	CONSTRAINT `kanri_orgs_managementId_unique` UNIQUE(`managementId`)
);
--> statement-breakpoint
CREATE TABLE `sheet_sync_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`target` enum('shien','kanri','management') NOT NULL,
	`baseDate` varchar(16) NOT NULL,
	`status` enum('success','aborted','error') NOT NULL,
	`totalCount` int NOT NULL DEFAULT 0,
	`added` int NOT NULL DEFAULT 0,
	`updated` int NOT NULL DEFAULT 0,
	`removed` int NOT NULL DEFAULT 0,
	`detail` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sheet_sync_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `articles` ADD `keyPoints` json;