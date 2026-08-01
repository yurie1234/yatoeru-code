ALTER TABLE `kanri_orgs` MODIFY COLUMN `migrationStatus` enum('unconfirmed','planned','preparing','undecided','applying','permitted','not_migrating') NOT NULL DEFAULT 'unconfirmed';--> statement-breakpoint
ALTER TABLE `kanri_orgs` ADD `nameKana` varchar(255);--> statement-breakpoint
ALTER TABLE `kanri_orgs` ADD `city` varchar(64);--> statement-breakpoint
ALTER TABLE `kanri_orgs` ADD `offices` text;--> statement-breakpoint
ALTER TABLE `kanri_orgs` ADD `verifiedNote` text;--> statement-breakpoint
ALTER TABLE `kanri_orgs` ADD `hasPenalty` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `kanri_orgs` ADD `penaltyDetail` text;--> statement-breakpoint
ALTER TABLE `kanri_orgs` ADD `penaltySource` varchar(512);--> statement-breakpoint
ALTER TABLE `kanri_orgs` ADD `sourceDate` varchar(16);--> statement-breakpoint
ALTER TABLE `org_events` ADD `entityType` enum('org','kanri') DEFAULT 'org' NOT NULL;