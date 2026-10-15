CREATE TABLE `app_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`cycle` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cuddle_events` (
	`id` text PRIMARY KEY NOT NULL,
	`plushie_id` text NOT NULL,
	`cuddled_at` integer NOT NULL,
	FOREIGN KEY (`plushie_id`) REFERENCES `plushies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `plushies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`image_key` text,
	`cuddle_count` integer DEFAULT 0 NOT NULL,
	`last_cuddled_at` integer,
	`queue_position` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`plushie_id` text NOT NULL,
	`suggester_name` text DEFAULT 'Someone' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`plushie_id`) REFERENCES `plushies`(`id`) ON UPDATE no action ON DELETE cascade
);
