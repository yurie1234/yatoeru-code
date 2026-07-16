CREATE TABLE `consultations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgIds` json NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`contactName` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32),
	`prefecture` varchar(16),
	`industry` varchar(128),
	`field` varchar(128),
	`headcount` varchar(32),
	`message` text,
	`diagnosisId` int,
	`status` enum('new','sent','closed') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consultations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `diagnoses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inputUrl` varchar(1024) NOT NULL,
	`companyName` varchar(255),
	`industry` varchar(255),
	`result` json,
	`matchScore` int,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `diagnoses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plan_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgName` varchar(255) NOT NULL,
	`regNo` varchar(32),
	`contactName` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32),
	`plan` enum('standard','premium') NOT NULL,
	`message` text,
	`status` enum('new','contacted','active','cancelled') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plan_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`diagnosisId` int,
	`companyName` varchar(255),
	`content` text,
	`email` varchar(320),
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `proposals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`source` enum('verified','user') NOT NULL DEFAULT 'user',
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`rating` int NOT NULL,
	`title` varchar(255),
	`body` text,
	`reviewerCompanyType` varchar(128),
	`reviewerIndustry` varchar(128),
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_orgs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`regNo` varchar(32) NOT NULL,
	`regDate` varchar(16),
	`name` varchar(255) NOT NULL,
	`postal` varchar(16),
	`address` text,
	`prefecture` varchar(16),
	`phone` varchar(32),
	`representative` varchar(255),
	`officeName` varchar(255),
	`optionalSupport` boolean DEFAULT false,
	`startDate` varchar(16),
	`languages` json,
	`languagesRaw` text,
	`note` text,
	`plan` enum('free','paid') NOT NULL DEFAULT 'free',
	`monthlyFeeMin` int,
	`monthlyFeeMax` int,
	`initialFeeMin` int,
	`initialFeeMax` int,
	`fields` json,
	`hasPenalty` boolean DEFAULT false,
	`penaltyDetail` text,
	`supportedWorkers` int,
	`description` text,
	`websiteUrl` varchar(512),
	`reviewCount` int NOT NULL DEFAULT 0,
	`ratingAvg` decimal(3,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `support_orgs_id` PRIMARY KEY(`id`),
	CONSTRAINT `support_orgs_regNo_unique` UNIQUE(`regNo`)
);
