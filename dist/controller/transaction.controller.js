"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTransaction = exports.updateTransaction = exports.createTransaction = exports.getTransactionById = exports.getAllTransactions = void 0;
const db_1 = require("../config/db");
const transaction_model_1 = require("../models/transaction.model");
const http_1 = require("../utils/http");
// SAFE ID PARSER
const parseId = (rawId) => {
    const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);
    if (!id || isNaN(id)) {
        throw new http_1.AppError("Invalid transaction ID.", 400);
    }
    return id;
};
// GET ALL TRANSACTIONS
exports.getAllTransactions = (0, http_1.asyncHandler)(async (req, res) => {
    const transactions = await transaction_model_1.TransactionModel.findAll();
    const transactedByIds = Array.from(new Set(transactions.map((transaction) => transaction.transacted_by)));
    const transactedByEmployees = await db_1.prisma.employees.findMany({
        where: { employee_id: { in: transactedByIds } },
        include: { user_informations: true },
    });
    const employeesById = new Map(transactedByEmployees.map((employee) => [employee.employee_id, employee]));
    // Format the data for the frontend
    const formattedTransactions = transactions.map((transaction) => {
        const employee = employeesById.get(transaction.transacted_by);
        let processedBy = "Unknown";
        if (employee?.user_informations) {
            processedBy = `${employee.user_informations.last_name || ""}, ${employee.user_informations.first_name || ""}`.trim();
        }
        else if ((transaction.reference_type || "").toLowerCase() === "employee") {
            processedBy = "Deleted Employee";
        }
        const transactionDate = transaction.transaction_date
            ? new Date(transaction.transaction_date)
            : new Date();
        const dateFormatted = transactionDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
        const dateValue = transactionDate.toISOString().split("T")[0];
        const refTypeRaw = (transaction.reference_type || "").toLowerCase();
        let referenceType = "transaction";
        let referenceId = transaction.transaction_id;
        if (refTypeRaw === "employee") {
            referenceType = "employee";
            referenceId = transaction.employee_id ?? transaction.transaction_id;
        }
        else if (refTypeRaw === "position" || transaction.position_id) {
            referenceType = "position";
            referenceId = transaction.position_id ?? transaction.transaction_id;
        }
        else if (refTypeRaw === "department" || transaction.department_id) {
            referenceType = "department";
            referenceId = transaction.department_id ?? transaction.transaction_id;
        }
        else if (refTypeRaw === "salary" || transaction.salary_id) {
            referenceType = "salary";
            referenceId = transaction.salary_id ?? transaction.transaction_id;
        }
        else if (refTypeRaw === "work hour" ||
            refTypeRaw === "work-hour" ||
            transaction.work_hour_id) {
            referenceType = "work-hour";
            referenceId = transaction.work_hour_id ?? transaction.transaction_id;
        }
        return {
            transactionNo: String(transaction.transaction_id).padStart(8, "0"),
            processedBy,
            classification: transaction.transaction_type,
            referenceNo: String(referenceId).padStart(8, "0"),
            referenceType,
            referenceId,
            date: dateFormatted,
            dateValue,
        };
    });
    res.status(200).json({
        success: true,
        data: formattedTransactions,
    });
});
// GET TRANSACTION BY ID
exports.getTransactionById = (0, http_1.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    const transaction = await transaction_model_1.TransactionModel.findById(id);
    if (!transaction) {
        throw new http_1.AppError("Transaction not found.", 404);
    }
    res.status(200).json({
        success: true,
        data: transaction,
    });
});
// CREATE TRANSACTION
exports.createTransaction = (0, http_1.asyncHandler)(async (req, res) => {
    const transactionData = req.body;
    const transaction = await transaction_model_1.TransactionModel.create(transactionData);
    res.status(201).json({
        success: true,
        data: transaction,
    });
});
// UPDATE TRANSACTION
exports.updateTransaction = (0, http_1.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    const updateData = req.body;
    const existing = await transaction_model_1.TransactionModel.findById(id);
    if (!existing) {
        throw new http_1.AppError("Transaction not found.", 404);
    }
    const transaction = await transaction_model_1.TransactionModel.updateById(id, updateData);
    res.status(200).json({
        success: true,
        data: transaction,
    });
});
// DELETE TRANSACTION
exports.deleteTransaction = (0, http_1.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await transaction_model_1.TransactionModel.findById(id);
    if (!existing) {
        throw new http_1.AppError("Transaction not found.", 404);
    }
    await transaction_model_1.TransactionModel.deleteById(id);
    res.status(200).json({
        success: true,
        message: "Transaction deleted successfully.",
    });
});
