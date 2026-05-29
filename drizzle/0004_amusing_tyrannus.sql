CREATE TABLE `projectTeamAssignments` (
	`id` varchar(64) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`roleId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`assignmentDate` varchar(10),
	`startDate` varchar(10),
	`endDate` varchar(10),
	`status` enum('pending','active','completed','on-hold') DEFAULT 'pending',
	`hoursAllocated` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectTeamAssignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectTeamRoles` (
	`id` varchar(64) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`roleName` varchar(255) NOT NULL,
	`roleDescription` text,
	`roleType` enum('manager','developer','designer','qa','devops','analyst','consultant','other') DEFAULT 'other',
	`numberOfPeople` int DEFAULT 1,
	`estimatedDuration` int,
	`requiredSkills` text,
	`responsibilities` text,
	`estimatedCost` varchar(100),
	`totalCost` varchar(100),
	`priority` enum('عالية','متوسطة','منخفضة') DEFAULT 'متوسطة',
	`isAssigned` boolean DEFAULT false,
	`assignedTo` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectTeamRoles_id` PRIMARY KEY(`id`)
);
