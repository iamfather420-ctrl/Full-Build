CREATE TABLE `audit_log` (
	`id` varchar(64) NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`userId` int,
	`orderId` varchar(64),
	`purchaseId` varchar(64),
	`vaultEntryId` varchar(64),
	`details` text NOT NULL,
	`ipAddress` varchar(45),
	`userAgent` text,
	`status` enum('success','failed','pending') NOT NULL DEFAULT 'success',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `owner_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`withdrawalAddress` varchar(255),
	`totalWithdrawn` decimal(20,8) NOT NULL DEFAULT '0',
	`lastWithdrawalAt` timestamp,
	`systemStatus` enum('active','maintenance','paused') NOT NULL DEFAULT 'active',
	`enableAutoPaymentDetection` boolean NOT NULL DEFAULT true,
	`enableAutoDelivery` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `owner_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_notifications` (
	`id` varchar(64) NOT NULL,
	`orderId` varchar(64) NOT NULL,
	`vaultEntryId` varchar(64),
	`notificationType` enum('payment_received','payment_confirmed','hold_expiring','hold_expired','solution_delivered','payment_failed','access_attempted','access_denied') NOT NULL,
	`message` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `solution_access_tokens` (
	`id` varchar(64) NOT NULL,
	`purchaseId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`paradoxId` varchar(64) NOT NULL,
	`token` varchar(255) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`accessCount` int NOT NULL DEFAULT 0,
	`lastAccessedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `solution_access_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `solution_access_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`paradoxId` varchar(64) NOT NULL,
	`status` enum('active','expired','cancelled','suspended') NOT NULL DEFAULT 'active',
	`accessLevel` enum('view','download','none') NOT NULL DEFAULT 'view',
	`maxAccessCount` int,
	`currentAccessCount` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp,
	`cancelledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_stats` (
	`id` varchar(64) NOT NULL,
	`snapshotDate` timestamp NOT NULL,
	`totalOrders` int NOT NULL DEFAULT 0,
	`totalRevenue` decimal(20,8) NOT NULL DEFAULT '0',
	`totalWithdrawals` decimal(20,8) NOT NULL DEFAULT '0',
	`vaultBalance` decimal(20,8) NOT NULL DEFAULT '0',
	`activeSubscriptions` int NOT NULL DEFAULT 0,
	`failedPayments` int NOT NULL DEFAULT 0,
	`accessAttempts` int NOT NULL DEFAULT 0,
	`deniedAccess` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `system_stats_id` PRIMARY KEY(`id`)
);
