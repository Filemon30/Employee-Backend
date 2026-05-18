import { Request, Response } from "express";
import { TransactionModel } from "../models/transaction.model";
import { AppError, asyncHandler } from "../utils/http";

// SAFE ID PARSER
const parseId = (rawId: unknown): number => {
  const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);

  if (!id || isNaN(id)) {
    throw new AppError("Invalid transaction ID.", 400);
  }

  return id;
};

// GET ALL TRANSACTIONS
export const getAllTransactions = asyncHandler(
  async (req: Request, res: Response) => {
    const transactions = await TransactionModel.findAll();

    // Format the data for the frontend
    const formattedTransactions = transactions.map((transaction) => {
      const transactedByEmployee = transaction.employees_transactions_transacted_byToemployees;
      const processedBy = transactedByEmployee
        ? `${transactedByEmployee.user_informations?.last_name || ''}, ${transactedByEmployee.user_informations?.first_name || ''}`.trim()
        : 'Unknown';

      // Format transaction date
      const transactionDate = transaction.transaction_date
        ? new Date(transaction.transaction_date)
        : new Date();

      const dateFormatted = transactionDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      const dateValue = transactionDate.toISOString().split('T')[0];

      // Determine reference type and ID
      let referenceType = 'transaction';
      let referenceId = transaction.transaction_id;

      if (transaction.employee_id) {
        referenceType = 'employee';
        referenceId = transaction.employee_id;
      } else if (transaction.position_id) {
        referenceType = 'position';
        referenceId = transaction.position_id;
      } else if (transaction.department_id) {
        referenceType = 'department';
        referenceId = transaction.department_id;
      } else if (transaction.salary_id) {
        referenceType = 'salary';
        referenceId = transaction.salary_id;
      } else if (transaction.work_hour_id) {
        referenceType = 'work-hour';
        referenceId = transaction.work_hour_id;
      }

      return {
        transactionNo: String(transaction.transaction_id).padStart(8, '0'),
        processedBy,
        classification: transaction.transaction_type,
        referenceNo: String(referenceId).padStart(8, '0'),
        referenceType,
        referenceId,
        date: dateFormatted,
        dateValue
      };
    });

    res.status(200).json({
      success: true,
      data: formattedTransactions,
    });
  }
);

// GET TRANSACTION BY ID
export const getTransactionById = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseId(req.params.id);
    const transaction = await TransactionModel.findById(id);

    if (!transaction) {
      throw new AppError("Transaction not found.", 404);
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  }
);

// CREATE TRANSACTION
export const createTransaction = asyncHandler(
  async (req: Request, res: Response) => {
    const transactionData = req.body;
    const transaction = await TransactionModel.create(transactionData);

    res.status(201).json({
      success: true,
      data: transaction,
    });
  }
);

// UPDATE TRANSACTION
export const updateTransaction = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseId(req.params.id);
    const updateData = req.body;

    const existing = await TransactionModel.findById(id);
    if (!existing) {
      throw new AppError("Transaction not found.", 404);
    }

    const transaction = await TransactionModel.updateById(id, updateData);

    res.status(200).json({
      success: true,
      data: transaction,
    });
  }
);

// DELETE TRANSACTION
export const deleteTransaction = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseId(req.params.id);

    const existing = await TransactionModel.findById(id);
    if (!existing) {
      throw new AppError("Transaction not found.", 404);
    }

    await TransactionModel.deleteById(id);

    res.status(200).json({
      success: true,
      message: "Transaction deleted successfully.",
    });
  }
);