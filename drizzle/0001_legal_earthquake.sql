CREATE TABLE `activityLog` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`taskId` varchar(64),
	`action` varchar(100) NOT NULL,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activityLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` varchar(64) NOT NULL,
	`taskId` varchar(64) NOT NULL,
	`url` text NOT NULL,
	`fileName` varchar(500),
	`fileType` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lists` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`icon` varchar(10) DEFAULT '📋',
	`color` varchar(7) DEFAULT '#7C6EFA',
	`isSystem` boolean DEFAULT false,
	`order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`projectId` varchar(64),
	`title` varchar(500) NOT NULL,
	`content` text,
	`tags` varchar(500),
	`isPinned` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`icon` varchar(10) DEFAULT '🚀',
	`color` varchar(7) DEFAULT '#7C6EFA',
	`status` enum('active','archived') DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `statistics` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`tasksCompleted` int DEFAULT 0,
	`tasksPending` int DEFAULT 0,
	`tasksTotal` int DEFAULT 0,
	`timeLogged` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `statistics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subtasks` (
	`id` varchar(64) NOT NULL,
	`taskId` varchar(64) NOT NULL,
	`name` varchar(500) NOT NULL,
	`isDone` boolean DEFAULT false,
	`order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subtasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`listId` varchar(64) NOT NULL,
	`projectId` varchar(64),
	`name` varchar(500) NOT NULL,
	`description` text,
	`priority` enum('منخفضة','متوسطة','عالية') DEFAULT 'متوسطة',
	`isDone` boolean DEFAULT false,
	`dueDate` varchar(10),
	`dueTime` varchar(5),
	`loggedMinutes` int DEFAULT 0,
	`recurrence` enum('none','daily','weekly','monthly') DEFAULT 'none',
	`recurrenceEndDate` varchar(10),
	`kanbanColumn` varchar(20) DEFAULT 'todo',
	`order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
