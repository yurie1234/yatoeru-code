ALTER TABLE `support_orgs` ADD `verifiedNote` text;--> statement-breakpoint
ALTER TABLE `support_orgs` ADD `isDeleted` boolean DEFAULT false NOT NULL;