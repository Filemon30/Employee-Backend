import { Router } from "express";
import {
    createTransaction,
    getAllTransactions,
    getTransactionById,
    updateTransaction,
    deleteTransaction
} from "../controller/transaction.controller";

const transactionRouter = Router();

transactionRouter.post("/", createTransaction);
transactionRouter.get("/", getAllTransactions);
transactionRouter.get("/:id", getTransactionById);
transactionRouter.put("/:id", updateTransaction);
transactionRouter.delete("/:id", deleteTransaction);

export { transactionRouter };