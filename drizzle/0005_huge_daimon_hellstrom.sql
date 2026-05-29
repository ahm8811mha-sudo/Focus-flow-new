ALTER TABLE `projectSteps` MODIFY COLUMN `status` enum('pending','in-progress','completed','on-hold','cancelled','delayed') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `projectSteps` ADD `actualStartDate` varchar(10);--> statement-breakpoint
ALTER TABLE `projectSteps` ADD `isCompleted` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `projectSteps` ADD `notes` text;