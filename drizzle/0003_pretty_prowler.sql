ALTER TABLE `support_orgs` ADD `consultStatus` enum('unknown','open','open_active','paused') DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `support_orgs` ADD `preferredFields` json;--> statement-breakpoint
ALTER TABLE `support_orgs` ADD `preferredRegions` json;--> statement-breakpoint
ALTER TABLE `support_orgs` ADD `preferredNote` text;--> statement-breakpoint
ALTER TABLE `support_orgs` ADD `internalMemo` text;--> statement-breakpoint
ALTER TABLE `support_orgs` ADD `aliases` json;--> statement-breakpoint
ALTER TABLE `support_orgs` ADD `verifiedAt` timestamp;