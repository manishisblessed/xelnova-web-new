-- Add approved field to reviews for admin moderation
ALTER TABLE "reviews" ADD COLUMN "approved" BOOLEAN NOT NULL DEFAULT false;

-- Create index for efficient filtering of pending reviews
CREATE INDEX "reviews_approved_idx" ON "reviews"("approved");

-- Update existing reviews to be approved (so current live reviews remain visible)
UPDATE "reviews" SET "approved" = true WHERE "approved" = false;
