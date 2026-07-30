CREATE TABLE `kanri_status_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgName` varchar(255) NOT NULL,
	`managementId` varchar(16),
	`prefecture` varchar(16),
	`migrationStatus` enum('preparing','applying','permitted','not_migrating') NOT NULL,
	`contactName` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32),
	`note` text,
	`consented_at` timestamp,
	`status` enum('new','verified','reflected','rejected') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kanri_status_submissions_id` PRIMARY KEY(`id`)
);
