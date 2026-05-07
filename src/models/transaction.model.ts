import { prisma } from "../config/db";
import { nextIdFromMax } from "../utils/next-id";

export type CreateTransactionInput = {
  transaction_type: string;
  transacted_by: number;
  reference_type: string;
  department_id?: number;
  position_id?: number;
  salary_id?: number;
  work_hour_id?: number;
  employee_id?: number;
  transaction_date?: Date;
};

export type UpdateTransactionInput = Partial<CreateTransactionInput>;

export class TransactionModel {
  static async create(data: CreateTransactionInput) {
    const transactionId = await nextIdFromMax(async () => {
      const result = await prisma.transactions.aggregate({
        _max: { transaction_id: true },
      });

      return result._max.transaction_id;
    });

    return prisma.transactions.create({
      data: {
        transaction_id: transactionId,
        ...data,
      },
      include: {
        department: true,
        position: true,
        salary: true,
        work_hour: true,
        employees_transactions_employee_idToemployees: true,
        employees_transactions_transacted_byToemployees: true,
      },
    });
  }

  static findAll() {
    return prisma.transactions.findMany({
      include: {
        department: true,
        position: true,
        salary: true,
        work_hour: true,
        employees_transactions_employee_idToemployees: true,
        employees_transactions_transacted_byToemployees: true,
      },
      orderBy: { transaction_id: "desc" },
    });
  }

  static findById(transactionId: number) {
    return prisma.transactions.findUnique({
      where: { transaction_id: transactionId },
      include: {
        department: true,
        position: true,
        salary: true,
        work_hour: true,
        employees_transactions_employee_idToemployees: true,
        employees_transactions_transacted_byToemployees: true,
      },
    });
  }

  static updateById(transactionId: number, data: UpdateTransactionInput) {
    return prisma.transactions.update({
      where: { transaction_id: transactionId },
      data,
      include: {
        department: true,
        position: true,
        salary: true,
        work_hour: true,
        employees_transactions_employee_idToemployees: true,
        employees_transactions_transacted_byToemployees: true,
      },
    });
  }

  static deleteById(transactionId: number) {
    return prisma.transactions.delete({
      where: { transaction_id: transactionId },
    });
  }
}
