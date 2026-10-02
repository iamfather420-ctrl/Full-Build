CREATE TABLE `device_access_logs` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`deviceId` varchar(64) NOT NULL,
	`nodeId` varchar(64) NOT NULL,
	`paradoxId` varchar(64) NOT NULL,
	`accessType` enum('view','download','sync','export') NOT NULL,
	`status` enum('success','failed','denied') NOT NULL,
	`reason` varchar(255),
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `device_access_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`nodeId` varchar(64) NOT NULL,
	`deviceName` varchar(255) NOT NULL,
	`deviceType` enum('desktop','mobile','tablet','server') NOT NULL,
	`deviceId` varchar(255) NOT NULL,
	`ipAddress` varchar(45),
	`userAgent` text,
	`status` enum('active','inactive','revoked') NOT NULL DEFAULT 'active',
	`lastAccessedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `devices_deviceId_unique` UNIQUE(`deviceId`)
);
--> statement-breakpoint
CREATE TABLE `node_pricing` (
	`id` varchar(64) NOT NULL,
	`paradoxId` varchar(64) NOT NULL,
	`nodeQuantity` int NOT NULL,
	`priceEth` decimal(18,8) NOT NULL,
	`priceUsdc` decimal(18,6) NOT NULL,
	`priceBtc` decimal(18,8) NOT NULL,
	`discount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `node_pricing_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `node_purchases` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`paradoxId` varchar(64) NOT NULL,
	`nodeCount` int NOT NULL,
	`pricePerNode` decimal(18,8) NOT NULL,
	`totalPrice` decimal(18,8) NOT NULL,
	`paymentMethod` enum('eth','usdc','btc') NOT NULL,
	`status` enum('pending','confirmed','delivered','failed') NOT NULL DEFAULT 'pending',
	`transactionHash` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`confirmedAt` timestamp,
	`deliveredAt` timestamp,
	CONSTRAINT `node_purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nodes` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`paradoxId` varchar(64) NOT NULL,
	`nodeKey` varchar(255) NOT NULL,
	`status` enum('active','inactive','revoked','expired') NOT NULL DEFAULT 'active',
	`maxDevices` int NOT NULL DEFAULT 1,
	`currentDeviceCount` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `nodes_nodeKey_unique` UNIQUE(`nodeKey`)
);
--> statement-breakpoint
CREATE TABLE `user_enterprise_settings` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`companyName` varchar(255),
	`maxDevicesPerNode` int NOT NULL DEFAULT 1,
	`enableDeviceSync` boolean NOT NULL DEFAULT true,
	`enableOfflineAccess` boolean NOT NULL DEFAULT false,
	`enableAuditLogging` boolean NOT NULL DEFAULT true,
	`enableIPRestriction` boolean NOT NULL DEFAULT false,
	`allowedIPs` text,
	`enableTwoFactor` boolean NOT NULL DEFAULT false,
	`apiKeyEnabled` boolean NOT NULL DEFAULT false,
	`apiKey` varchar(255),
	`dataRetentionDays` int NOT NULL DEFAULT 90,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_enterprise_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_enterprise_settings_userId_unique` UNIQUE(`userId`)
);
