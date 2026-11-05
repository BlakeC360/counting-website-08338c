CREATE TABLE "player_badges" (
	"player_id" text,
	"badge_id" text,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_badges_pkey" PRIMARY KEY("player_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "player_fonts" (
	"player_id" text,
	"font_id" text,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_fonts_pkey" PRIMARY KEY("player_id","font_id")
);
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "boost_coins" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "font" text;--> statement-breakpoint
CREATE UNIQUE INDEX "players_user_id_idx" ON "players" ("user_id");