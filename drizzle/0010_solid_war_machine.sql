ALTER TABLE `support_orgs` ADD `referralIntent` enum('unknown','interested','negotiating','agreed','declined') DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `support_orgs` ADD `referralNote` text;--> statement-breakpoint
ALTER TABLE `support_orgs` ADD `referralUpdatedAt` timestamp;