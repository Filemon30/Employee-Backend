import { prisma } from "../config/db";
import { nextIdFromMax } from "../utils/next-id";

export type CreateUserAccountInput = {
  username: string;
  password: string;
};

export type UpdateUserAccountInput = Partial<CreateUserAccountInput>;

export class UserAccountModel {
  static async create(data: CreateUserAccountInput) {
    const accId = await nextIdFromMax(async () => {
      const result = await prisma.user_accounts.aggregate({
        _max: { acc_id: true },
      });

      return result._max.acc_id;
    });

    return prisma.user_accounts.create({
      data: {
        acc_id: accId,
        ...data,
      },
      include: { employees: true },
    });
  }

  static findAll() {
    return prisma.user_accounts.findMany({
      include: { employees: true },
      orderBy: { acc_id: "asc" },
    });
  }

  static findById(accId: number) {
    return prisma.user_accounts.findUnique({
      where: { acc_id: accId },
      include: { employees: true },
    });
  }

  static updateById(accId: number, data: UpdateUserAccountInput) {
    return prisma.user_accounts.update({
      where: { acc_id: accId },
      data,
      include: { employees: true },
    });
  }

  static deleteById(accId: number) {
    return prisma.user_accounts.delete({
      where: { acc_id: accId },
    });
  }
}
