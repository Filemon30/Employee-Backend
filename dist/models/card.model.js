"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardModel = void 0;
const db_1 = require("../config/db");
const next_id_1 = require("../utils/next-id");
class CardModel {
    static async create(data) {
        const cardId = await (0, next_id_1.nextIdFromMax)(async () => {
            const result = await db_1.prisma.cards.aggregate({
                _max: { card_id: true },
            });
            return result._max.card_id;
        });
        return db_1.prisma.cards.create({
            data: {
                card_id: cardId,
                ...data,
            },
            include: { employees: true },
        });
    }
    static findAll() {
        return db_1.prisma.cards.findMany({
            include: { employees: true },
            orderBy: { card_id: "asc" },
        });
    }
    static findById(cardId) {
        return db_1.prisma.cards.findUnique({
            where: { card_id: cardId },
            include: { employees: true },
        });
    }
    static updateById(cardId, data) {
        return db_1.prisma.cards.update({
            where: { card_id: cardId },
            data,
            include: { employees: true },
        });
    }
    static deleteById(cardId) {
        return db_1.prisma.cards.delete({
            where: { card_id: cardId },
        });
    }
}
exports.CardModel = CardModel;
