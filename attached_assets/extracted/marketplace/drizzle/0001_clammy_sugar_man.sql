CREATE TABLE `orders` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`paradoxId` varchar(64) NOT NULL,
	`status` enum('pending','confirmed','delivered','failed') NOT NULL DEFAULT 'pending',
	`paymentMethod` enum('eth','usdc','btc') NOT NULL,
	`amount` decimal(18,8) NOT NULL,
	`walletAddress` varchar(255) NOT NULL,
	`transactionHash` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`confirmedAt` timestamp,
	`deliveredAt` timestamp,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paradox_products` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('fundamental','ai','operational') NOT NULL,
	`description` text NOT NULL,
	`solution` text NOT NULL,
	`impact` text NOT NULL,
	`priceEth` decimal(18,8) NOT NULL,
	`priceUsdc` decimal(18,6) NOT NULL,
	`priceBtc` decimal(18,8) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paradox_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_purchases` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`paradoxId` varchar(64) NOT NULL,
	`orderId` varchar(64) NOT NULL,
	`unlockedAt` timestamp,
	`purchasedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vault_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`holdPeriodHours` int NOT NULL DEFAULT 72,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vault_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vault_ledger` (
	`id` varchar(64) NOT NULL,
	`orderId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`amount` decimal(18,8) NOT NULL,
	`paymentMethod` enum('eth','usdc','btc') NOT NULL,
	`status` enum('pending','held','available','withdrawn') NOT NULL DEFAULT 'pending',
	`holdUntil` timestamp NOT NULL,
	`withdrawnAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vault_ledger_id` PRIMARY KEY(`id`)
);
