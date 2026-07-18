CREATE TABLE `org_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int,
	`eventType` varchar(48) NOT NULL,
	`source` varchar(128),
	`path` varchar(512),
	`referrer` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `org_events_id` PRIMARY KEY(`id`)
);
