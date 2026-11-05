CREATE TABLE "player_nametags" (
	"player_id" text,
	"tag_id" text,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_nametags_pkey" PRIMARY KEY("player_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "coins_spent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "nametag" text;