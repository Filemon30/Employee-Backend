/*
  Warnings:

  - You are about to drop the column `status` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `time_in` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `time_out` on the `attendances` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "attendances" DROP COLUMN "status",
DROP COLUMN "time_in",
DROP COLUMN "time_out",
ADD COLUMN     "afternoon_in_status" VARCHAR(50),
ADD COLUMN     "afternoon_out_status" VARCHAR(50),
ADD COLUMN     "afternoon_time_in" TIME(6),
ADD COLUMN     "afternoon_time_out" TIME(6),
ADD COLUMN     "morning_in_status" VARCHAR(50),
ADD COLUMN     "morning_out_status" VARCHAR(50),
ADD COLUMN     "morning_time_in" TIME(6),
ADD COLUMN     "morning_time_out" TIME(6);
