-- Step 1: Add new column for array of specializations
ALTER TABLE "Technician" ADD COLUMN "specializations" TEXT[];

-- Step 2: Migrate existing data - convert single specialization to array
UPDATE "Technician" SET "specializations" = ARRAY["specialization"] WHERE "specialization" IS NOT NULL;

-- Step 3: Set default empty array for any null values
UPDATE "Technician" SET "specializations" = '{}' WHERE "specializations" IS NULL;

-- Step 4: Make the new column NOT NULL (since we've populated all rows)
ALTER TABLE "Technician" ALTER COLUMN "specializations" SET NOT NULL;

-- Step 5: Drop the old column
ALTER TABLE "Technician" DROP COLUMN "specialization";
