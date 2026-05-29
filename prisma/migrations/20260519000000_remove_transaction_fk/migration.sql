-- Remove foreign key constraints from transactions so audit references remain intact after related entities are deleted.
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_department_id_fkey;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_position_id_fkey;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_salary_id_fkey;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_work_hour_id_fkey;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_employee_id_fkey;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_transacted_by_fkey;
