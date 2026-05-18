/*
  Warnings:

  - You are about to drop the column `work_hour_id` on the `employees` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_work_hour_id_fkey";

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "work_hour_id",
ADD COLUMN     "afternoon_work_hour_id" INTEGER,
ADD COLUMN     "morning_work_hour_id" INTEGER;

-- AlterTable
ALTER TABLE "work_hours" ALTER COLUMN "lunch_break_minutes" DROP NOT NULL,
ALTER COLUMN "lunch_break_minutes" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_morning_work_hour_id_fkey" FOREIGN KEY ("morning_work_hour_id") REFERENCES "work_hours"("work_hour_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_afternoon_work_hour_id_fkey" FOREIGN KEY ("afternoon_work_hour_id") REFERENCES "work_hours"("work_hour_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
