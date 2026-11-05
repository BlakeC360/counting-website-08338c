CREATE TABLE "player_number_anims" (
	"player_id" text,
	"anim_id" text,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_number_anims_pkey" PRIMARY KEY("player_id","anim_id")
);
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "number_anim" text;