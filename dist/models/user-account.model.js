"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAccountModel = void 0;
const db_1 = require("../config/db");
const next_id_1 = require("../utils/next-id");
class UserAccountModel {
    static async create(data) {
        const accId = await (0, next_id_1.nextIdFromMax)(async () => {
            const result = await db_1.prisma.user_accounts.aggregate({
                _max: { acc_id: true },
            });
            return result._max.acc_id;
        });
        return db_1.prisma.user_accounts.create({
            data: {
                acc_id: accId,
                ...data,
            },
            include: { employees: true },
        });
    }
    static findAll() {
        return db_1.prisma.user_accounts.findMany({
            include: { employees: true },
            orderBy: { acc_id: "asc" },
        });
    }
    static findById(accId) {
        return db_1.prisma.user_accounts.findUnique({
            where: { acc_id: accId },
            include: { employees: true },
        });
    }
    static findByUsername(username) {
        return db_1.prisma.user_accounts.findUnique({
            where: { username },
            include: { employees: true },
        });
    }
    static updateById(accId, data) {
        return db_1.prisma.user_accounts.update({
            where: { acc_id: accId },
            data,
            include: { employees: true },
        });
    }
    static deleteById(accId) {
        return db_1.prisma.user_accounts.delete({
            where: { acc_id: accId },
        });
    }
}
exports.UserAccountModel = UserAccountModel;
