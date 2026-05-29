"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionModel = void 0;
const db_1 = require("../config/db");
const next_id_1 = require("../utils/next-id");
class TransactionModel {
    static async create(data) {
        const transactionId = await (0, next_id_1.nextIdFromMax)(async () => {
            const result = await db_1.prisma.transactions.aggregate({
                _max: { transaction_id: true },
            });
            return result._max.transaction_id;
        });
        return db_1.prisma.transactions.create({
            data: {
                transaction_id: transactionId,
                ...data,
            },
        });
    }
    static findAll() {
        return db_1.prisma.transactions.findMany({
            orderBy: { transaction_id: "desc" },
        });
    }
    static findById(transactionId) {
        return db_1.prisma.transactions.findUnique({
            where: { transaction_id: transactionId },
        });
    }
    static updateById(transactionId, data) {
        return db_1.prisma.transactions.update({
            where: { transaction_id: transactionId },
            data,
        });
    }
    static deleteById(transactionId) {
        return db_1.prisma.transactions.delete({
            where: { transaction_id: transactionId },
        });
    }
}
exports.TransactionModel = TransactionModel;
