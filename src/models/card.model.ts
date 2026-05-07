import { prisma } from "../config/db";
import { nextIdFromMax } from "../utils/next-id";

export type CreateCardInput = {
  card_number: string;
};

export type UpdateCardInput = Partial<CreateCardInput>;

export class CardModel {
  static async create(data: CreateCardInput) {
    const cardId = await nextIdFromMax(async () => {
      const result = await prisma.cards.aggregate({
        _max: { card_id: true },
      });

      return result._max.card_id;
    });

    return prisma.cards.create({
      data: {
        card_id: cardId,
        ...data,
      },
      include: { employees: true },
    });
  }

  static findAll() {
    return prisma.cards.findMany({
      include: { employees: true },
      orderBy: { card_id: "asc" },
    });
  }

  static findById(cardId: number) {
    return prisma.cards.findUnique({
      where: { card_id: cardId },
      include: { employees: true },
    });
  }

  static updateById(cardId: number, data: UpdateCardInput) {
    return prisma.cards.update({
      where: { card_id: cardId },
      data,
      include: { employees: true },
    });
  }

  static deleteById(cardId: number) {
    return prisma.cards.delete({
      where: { card_id: cardId },
    });
  }
}
