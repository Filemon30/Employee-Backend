-- AlterTable
ALTER TABLE "departments"
ADD COLUMN "department_head" INTEGER;

-- AddForeignKey
ALTER TABLE "departments"
ADD CONSTRAINT "departments_department_head_fkey"
FOREIGN KEY ("department_head") REFERENCES "employees"("employee_id") ON DELETE SET NULL ON UPDATE NO ACTION;