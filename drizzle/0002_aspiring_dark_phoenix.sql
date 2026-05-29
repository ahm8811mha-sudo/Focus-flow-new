CREATE TABLE `projectActivities` (
	`id` varchar(64) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`type` enum('created','updated','completed','commented','member_added','member_removed','status_changed') NOT NULL,
	`description` text,
	`relatedTaskId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectActivities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectComments` (
	`id` varchar(64) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`taskId` varchar(64),
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectFiles` (
	`id` varchar(64) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`uploadedBy` int NOT NULL,
	`fileName` varchar(500) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileSize` int,
	`fileType` varchar(50),
	`folder` varchar(255) DEFAULT '/',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectMembers` (
	`id` varchar(64) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','editor','viewer','commenter') DEFAULT 'viewer',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectTemplates` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`icon` varchar(10) DEFAULT '📋',
	`color` varchar(7) DEFAULT '#7C6EFA',
	`templateData` text,
	`isPublic` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taskDependencies` (
	`id` varchar(64) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`taskId` varchar(64) NOT NULL,
	`dependsOnTaskId` varchar(64) NOT NULL,
	`dependencyType` enum('finish-to-start','start-to-start','finish-to-finish','start-to-finish') DEFAULT 'finish-to-start',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `taskDependencies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `status` enum('active','archived','completed','on-hold') DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `projects` ADD `startDate` varchar(10);--> statement-breakpoint
ALTER TABLE `projects` ADD `endDate` varchar(10);--> statement-breakpoint
ALTER TABLE `projects` ADD `priority` enum('منخفضة','متوسطة','عالية') DEFAULT 'متوسطة';--> statement-breakpoint
ALTER TABLE `projects` ADD `visibility` enum('private','shared','public') DEFAULT 'private';