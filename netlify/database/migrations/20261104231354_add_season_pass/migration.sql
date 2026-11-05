CREATE TABLE "player_titles" (
	"player_id" text,
	"title_id" text,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_titles_pkey" PRIMARY KEY("player_id","title_id")
);
--> statement-breakpoint
CREATE TABLE "season_claims" (
	"player_id" text,
	"season_id" text,
	"tier" integer,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "season_claims_pkey" PRIMARY KEY("player_id","season_id","tier")
);
--> statement-breakpoint
CREATE TABLE "season_progress" (
	"player_id" text,
	"season_id" text,
	"xp" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "season_progress_pkey" PRIMARY KEY("player_id","season_id")
);
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "bonus_coins" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "title" text;