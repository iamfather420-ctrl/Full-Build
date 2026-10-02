CREATE TABLE `crawled_problems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(256) NOT NULL,
	`platform` enum('reddit','quora','stackoverflow','hackernews','other') NOT NULL,
	`title` varchar(512) NOT NULL,
	`description` text NOT NULL,
	`sourceUrl` text NOT NULL,
	`category` enum('technical','legal','business','medical','financial','academic','creative','general','science','engineering','other') NOT NULL DEFAULT 'general',
	`suggestedPayment` decimal(10,2) DEFAULT '25.00',
	`isImported` boolean NOT NULL DEFAULT false,
	`importedProblemId` int,
	`aiSummary` text,
	`upvotes` int DEFAULT 0,
	`crawledAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crawled_problems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `earnings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`solverId` int NOT NULL,
	`problemId` int NOT NULL,
	`solutionId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'USD',
	`status` enum('pending','paid') NOT NULL DEFAULT 'pending',
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `earnings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `escrow_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`problemId` int NOT NULL,
	`clientId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'USD',
	`status` enum('pending','held','released','refunded','failed') NOT NULL DEFAULT 'pending',
	`stripePaymentIntentId` varchar(256),
	`stripeTransferId` varchar(256),
	`releasedAt` timestamp,
	`refundedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `escrow_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('new_problem','solution_submitted','solution_verified','payment_released','payment_refunded','problem_closed','crawler_found') NOT NULL,
	`title` varchar(256) NOT NULL,
	`message` text NOT NULL,
	`problemId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `problems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(512) NOT NULL,
	`description` text NOT NULL,
	`category` enum('technical','legal','business','medical','financial','academic','creative','general','science','engineering','other') NOT NULL DEFAULT 'general',
	`status` enum('open','in_review','solution_submitted','verifying','solved','closed','refunded') NOT NULL DEFAULT 'open',
	`source` enum('direct','reddit','quora','stackoverflow','hackernews','other') NOT NULL DEFAULT 'direct',
	`sourceUrl` text,
	`paymentOffer` decimal(10,2) NOT NULL DEFAULT '0.00',
	`currency` varchar(8) NOT NULL DEFAULT 'USD',
	`deadline` timestamp,
	`clientId` int,
	`tags` text,
	`viewCount` int NOT NULL DEFAULT 0,
	`isVerified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `problems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `solutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`problemId` int NOT NULL,
	`solverId` int NOT NULL,
	`content` text NOT NULL,
	`status` enum('pending','verifying','approved','rejected') NOT NULL DEFAULT 'pending',
	`verificationScore` decimal(5,2),
	`verificationNotes` text,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `solutions_id` PRIMARY KEY(`id`)
);
