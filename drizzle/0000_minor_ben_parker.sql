CREATE TABLE `account_progress` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`lessons_json` text NOT NULL,
	CONSTRAINT "account_progress_revision" CHECK("account_progress"."revision" >= 1 AND "account_progress"."revision" <= 9007199254740991),
	CONSTRAINT "account_progress_lessons_json" CHECK(json_valid("account_progress"."lessons_json") AND json_type("account_progress"."lessons_json") = 'object')
);
