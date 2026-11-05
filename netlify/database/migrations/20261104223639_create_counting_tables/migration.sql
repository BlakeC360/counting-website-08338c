CREATE TABLE "counts" (
	"id" serial PRIMARY KEY,
	"player_id" text NOT NULL,
	"player_name" text NOT NULL,
	"number" bigint NOT NULL,
	"ok" boolean NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_state" (
	"id" integer PRIMARY KEY,
	"current" bigint DEFAULT 0 NOT NULL,
	"last_player_id" text,
	"last_player_name" text,
	"record" bigint DEFAULT 0 NOT NULL,
	"last_reset_by" text,
	"last_reset_at" timestamp with time zone,
	"last_reset_from" bigint,
	"last_reset_reason" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sprints" (
	"id" text PRIMARY KEY,
	"player_id" text NOT NULL,
	"player_name" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"score" integer
);
--> statement-breakpoint
CREATE INDEX "counts_created_at_idx" ON "counts" ("created_at");--> statement-breakpoint
CREATE INDEX "counts_player_created_idx" ON "counts" ("player_id","created_at");--> statement-breakpoint
CREATE INDEX "sprints_score_idx" ON "sprints" ("score");