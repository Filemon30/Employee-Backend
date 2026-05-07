-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "attendance_status_enum" AS ENUM ('Present', 'Late', 'Absent', 'Leave');

-- CreateEnum
CREATE TYPE "gender_enum" AS ENUM ('Male', 'Female');

-- CreateTable
CREATE TABLE "attendances" (
    "attendance_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "attendance_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "time_in" TIME(6),
    "time_out" TIME(6),
    "status" "attendance_status_enum" NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("attendance_id")
);

-- CreateTable
CREATE TABLE "cards" (
    "card_id" INTEGER NOT NULL,
    "card_number" VARCHAR(120) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("card_id")
);

-- CreateTable
CREATE TABLE "departments" (
    "department_id" INTEGER NOT NULL,
    "department_name" VARCHAR(80) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("department_id")
);

-- CreateTable
CREATE TABLE "employees" (
    "employee_id" INTEGER NOT NULL,
    "position_id" INTEGER NOT NULL,
    "card_id" INTEGER,
    "acc_id" INTEGER NOT NULL,
    "info_id" INTEGER NOT NULL,
    "work_hour_id" INTEGER NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("employee_id")
);

-- CreateTable
CREATE TABLE "positions" (
    "position_id" INTEGER NOT NULL,
    "department_id" INTEGER NOT NULL,
    "salary_id" INTEGER NOT NULL,
    "position_name" VARCHAR(80) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("position_id")
);

-- CreateTable
CREATE TABLE "salaries" (
    "salary_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "salaries_pkey" PRIMARY KEY ("salary_id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "transaction_id" INTEGER NOT NULL,
    "transaction_type" VARCHAR(80) NOT NULL,
    "transacted_by" INTEGER NOT NULL,
    "reference_type" VARCHAR(30) NOT NULL,
    "department_id" INTEGER,
    "position_id" INTEGER,
    "salary_id" INTEGER,
    "work_hour_id" INTEGER,
    "employee_id" INTEGER,
    "transaction_date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "user_accounts" (
    "acc_id" INTEGER NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("acc_id")
);

-- CreateTable
CREATE TABLE "user_informations" (
    "info_id" INTEGER NOT NULL,
    "first_name" VARCHAR(50) NOT NULL,
    "middle_name" VARCHAR(50),
    "last_name" VARCHAR(50) NOT NULL,
    "gender" "gender_enum" NOT NULL,
    "birthdate" DATE NOT NULL,
    "province" VARCHAR(200) NOT NULL,
    "city" VARCHAR(200) NOT NULL,
    "barangay" VARCHAR(200) NOT NULL,
    "zip_code" VARCHAR(20) NOT NULL,
    "contact_number" VARCHAR(20) NOT NULL,
    "suffix" VARCHAR(20),

    CONSTRAINT "user_informations_pkey" PRIMARY KEY ("info_id")
);

-- CreateTable
CREATE TABLE "work_hours" (
    "work_hour_id" INTEGER NOT NULL,
    "time_in" TIME(6) NOT NULL,
    "time_out" TIME(6) NOT NULL,

    CONSTRAINT "work_hours_pkey" PRIMARY KEY ("work_hour_id")
);

-- CreateIndex
CREATE INDEX "idx_attendance_employee_date" ON "attendances"("employee_id", "attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_employee_id_attendance_date_key" ON "attendances"("employee_id", "attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "cards_card_number_key" ON "cards"("card_number");

-- CreateIndex
CREATE UNIQUE INDEX "departments_department_name_key" ON "departments"("department_name");

-- CreateIndex
CREATE UNIQUE INDEX "employees_card_id_key" ON "employees"("card_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_acc_id_key" ON "employees"("acc_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_info_id_key" ON "employees"("info_id");

-- CreateIndex
CREATE UNIQUE INDEX "positions_department_id_position_name_key" ON "positions"("department_id", "position_name");

-- CreateIndex
CREATE INDEX "idx_transaction_date" ON "transactions"("transaction_date");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_username_key" ON "user_accounts"("username");

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_acc_id_fkey" FOREIGN KEY ("acc_id") REFERENCES "user_accounts"("acc_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("card_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_info_id_fkey" FOREIGN KEY ("info_id") REFERENCES "user_informations"("info_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("position_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_work_hour_id_fkey" FOREIGN KEY ("work_hour_id") REFERENCES "work_hours"("work_hour_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_salary_id_fkey" FOREIGN KEY ("salary_id") REFERENCES "salaries"("salary_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("position_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_salary_id_fkey" FOREIGN KEY ("salary_id") REFERENCES "salaries"("salary_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_work_hour_id_fkey" FOREIGN KEY ("work_hour_id") REFERENCES "work_hours"("work_hour_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transacted_by_fkey" FOREIGN KEY ("transacted_by") REFERENCES "employees"("employee_id") ON DELETE NO ACTION ON UPDATE NO ACTION;