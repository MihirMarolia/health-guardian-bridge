CREATE TABLE `auditLogs` (
	`id` varchar(36) NOT NULL,
	`actorId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`resourceType` varchar(50) NOT NULL,
	`resourceId` varchar(36),
	`ipAddress` varchar(45),
	`userAgent` text,
	`details` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `observations` (
	`id` varchar(36) NOT NULL,
	`patientId` varchar(36) NOT NULL,
	`testType` varchar(100) NOT NULL,
	`resultValue` text,
	`status` enum('ordered','resulted') NOT NULL DEFAULT 'ordered',
	`orderedDate` timestamp NOT NULL,
	`resultedDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `observations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` varchar(36) NOT NULL,
	`healthCardHash` varchar(255) NOT NULL,
	`encryptedName` text NOT NULL,
	`dob` timestamp NOT NULL,
	`primaryPhysicianId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patients_id` PRIMARY KEY(`id`),
	CONSTRAINT `patients_healthCardHash_unique` UNIQUE(`healthCardHash`)
);
--> statement-breakpoint
CREATE TABLE `serviceRequests` (
	`id` varchar(36) NOT NULL,
	`patientId` varchar(36) NOT NULL,
	`requesterId` int NOT NULL,
	`specialistDomain` varchar(100) NOT NULL,
	`status` enum('draft','pending','accepted','completed') NOT NULL DEFAULT 'draft',
	`encryptedClinicalNotes` text NOT NULL,
	`aiConfidenceScore` decimal(3,2),
	`aiReasoningJson` text,
	`verifiedByPhysician` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serviceRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `timelineEvents` (
	`id` varchar(36) NOT NULL,
	`patientId` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`description` text NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `timelineEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('admin','physician','specialist') NOT NULL DEFAULT 'specialist',
	`licenseNumber` varchar(100),
	`twoFactorEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`),
	CONSTRAINT `users_licenseNumber_unique` UNIQUE(`licenseNumber`)
);
--> statement-breakpoint
CREATE INDEX `actor_idx` ON `auditLogs` (`actorId`);--> statement-breakpoint
CREATE INDEX `resource_idx` ON `auditLogs` (`resourceType`,`resourceId`);--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `auditLogs` (`timestamp`);--> statement-breakpoint
CREATE INDEX `patient_obs_idx` ON `observations` (`patientId`);--> statement-breakpoint
CREATE INDEX `obs_status_idx` ON `observations` (`status`);--> statement-breakpoint
CREATE INDEX `physician_idx` ON `patients` (`primaryPhysicianId`);--> statement-breakpoint
CREATE INDEX `patient_referral_idx` ON `serviceRequests` (`patientId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `serviceRequests` (`status`);--> statement-breakpoint
CREATE INDEX `patient_timeline_idx` ON `timelineEvents` (`patientId`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `timelineEvents` (`type`);--> statement-breakpoint
CREATE INDEX `role_idx` ON `users` (`role`);