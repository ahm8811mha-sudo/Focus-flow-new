CREATE TABLE `projectRequirements` (
	`id` varchar(64) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`stepId` varchar(64),
	`requirementName` varchar(255) NOT NULL,
	`description` text,
	`type` enum('resource','budget','material','personnel','equipment','other') DEFAULT 'resource',
	`quantity` varchar(100),
	`unit` varchar(50),
	`estimatedCost` decimal(12,2),
	`actualCost` decimal(12,2),
	`status` enum('pending','allocated','used','completed') DEFAULT 'pending',
	`priority` enum('منخفضة','متوسطة','عالية') DEFAULT 'متوسطة',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectRequirements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectResources` (
	`id` varchar(64) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`requirementId` varchar(64) NOT NULL,
	`resourceName` varchar(255) NOT NULL,
	`allocatedQuantity` varchar(100),
	`usedQuantity` varchar(100),
	`remainingQuantity` varchar(100),
	`allocatedBy` int,
	`allocationDate` varchar(10),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectResources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectSteps` (
	`id` varchar(64) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`stepName` varchar(255) NOT NULL,
	`description` text,
	`startDate` varchar(10),
	`plannedEndDate` varchar(10),
	`actualEndDate` varchar(10),
	`status` enum('pending','in-progress','completed','on-hold','cancelled') DEFAULT 'pending',
	`progress` int DEFAULT 0,
	`duration` int,
	`order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectSteps_id` PRIMARY KEY(`id`)
);
