"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserInformationModel = void 0;
const db_1 = require("../config/db");
const next_id_1 = require("../utils/next-id");
class UserInformationModel {
    static async create(data) {
        const infoId = await (0, next_id_1.nextIdFromMax)(async () => {
            const result = await db_1.prisma.user_informations.aggregate({
                _max: { info_id: true },
            });
            return result._max.info_id;
        });
        return db_1.prisma.user_informations.create({
            data: {
                info_id: infoId,
                ...data,
            },
            include: { employees: true },
        });
    }
    static findAll() {
        return db_1.prisma.user_informations.findMany({
            include: { employees: true },
            orderBy: { info_id: "asc" },
        });
    }
    static findById(infoId) {
        return db_1.prisma.user_informations.findUnique({
            where: { info_id: infoId },
            include: { employees: true },
        });
    }
    static updateById(infoId, data) {
        return db_1.prisma.user_informations.update({
            where: { info_id: infoId },
            data,
            include: { employees: true },
        });
    }
    static deleteById(infoId) {
        return db_1.prisma.user_informations.delete({
            where: { info_id: infoId },
        });
    }
}
exports.UserInformationModel = UserInformationModel;
