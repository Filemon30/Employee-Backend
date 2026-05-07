import { prisma } from "../config/db";
import { Gender } from "./enums.model";
import { nextIdFromMax } from "../utils/next-id";

export type CreateUserInformationInput = {
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  gender: Gender;
  birthdate: Date;
  province: string;
  city: string;
  barangay: string;
  zip_code: string;
  contact_number: string;
};

export type UpdateUserInformationInput = Partial<CreateUserInformationInput>;

export class UserInformationModel {
  static async create(data: CreateUserInformationInput) {
    const infoId = await nextIdFromMax(async () => {
      const result = await prisma.user_informations.aggregate({
        _max: { info_id: true },
      });

      return result._max.info_id;
    });

    return prisma.user_informations.create({
      data: {
        info_id: infoId,
        ...data,
      },
      include: { employees: true },
    });
  }

  static findAll() {
    return prisma.user_informations.findMany({
      include: { employees: true },
      orderBy: { info_id: "asc" },
    });
  }

  static findById(infoId: number) {
    return prisma.user_informations.findUnique({
      where: { info_id: infoId },
      include: { employees: true },
    });
  }

  static updateById(infoId: number, data: UpdateUserInformationInput) {
    return prisma.user_informations.update({
      where: { info_id: infoId },
      data,
      include: { employees: true },
    });
  }

  static deleteById(infoId: number) {
    return prisma.user_informations.delete({
      where: { info_id: infoId },
    });
  }
}
