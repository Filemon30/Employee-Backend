import { Request, Response } from "express";
import { prisma } from "../config/db";
import { WorkHourModel } from "../models/work-hour.model";
import { AppError, asyncHandler } from "../utils/http";
import { getTransactedById, logCrudTransaction } from "../utils/activity-log";

const REQUIRED_WORK_MINUTES = 4 * 60;
const LUNCH_START_MINUTE = 12 * 60;
const LUNCH_END_MINUTE = 13 * 60;

const parseId = (rawId: unknown): number => {
	const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);

	if (!id || Number.isNaN(id)) {
		throw new AppError("Invalid work hour ID.", 400);
	}

	return id;
};

const extractTimePortion = (raw: string): string => {
  const value = raw.trim();

  // ISO string: 2026-05-07T08:00:00.000Z
  if (value.includes("T")) {
    return value.split("T")[1].substring(0, 8);
  }

  // JS Date string: Thu May 07 2026 08:00:00 GMT+0800
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  return value;
};

const normalizeRawTime = (rawTime: unknown, field: string): string => {
  if (typeof rawTime !== "string" || !rawTime.trim()) {
    throw new AppError(`${field} is required.`, 400);
  }

  return extractTimePortion(rawTime);
};

const parseTimeToMinutes = (rawTime: unknown, fieldName: string): number => {
  const cleaned = normalizeRawTime(rawTime, fieldName).toUpperCase();

  const twentyFourHour = /^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
  const twelveHour = /^(?:0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/;

  if (twentyFourHour.test(cleaned)) {
    const [hourText, minuteText] = cleaned.split(":");
    return Number(hourText) * 60 + Number(minuteText);
  }

  if (twelveHour.test(cleaned)) {
    const match = cleaned.match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/);
    if (!match) throw new AppError(`Invalid ${fieldName} format.`, 400);

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    const period = match[3];
    const normalizedHour =
      period === "AM" ? hour % 12 : (hour % 12) + 12;

    return normalizedHour * 60 + minute;
  }

  throw new AppError(
    `${fieldName} must be in HH:mm, HH:mm:ss, or h:mm AM/PM format.`,
    400
  );
};



const formatMinutesAsTime = (minutes: number): string => {
	const normalizedHours = Math.floor(minutes / 60)
		.toString()
		.padStart(2, "0");
	const normalizedMinutes = (minutes % 60).toString().padStart(2, "0");

	return `${normalizedHours}:${normalizedMinutes}`;
};

const getEffectiveWorkMinutes = (timeInMinutes: number, timeOutMinutes: number): number => {
	if (timeOutMinutes <= timeInMinutes) {
		throw new AppError("time_out must be later than time_in.", 400);
	}

	const totalMinutes = timeOutMinutes - timeInMinutes;
	const lunchOverlap = Math.max(
		0,
		Math.min(timeOutMinutes, LUNCH_END_MINUTE) -
			Math.max(timeInMinutes, LUNCH_START_MINUTE)
	);

	return totalMinutes - lunchOverlap;
};

const validateBusinessRule = (timeIn: string, timeOut: string): void => {
	const timeInMinutes = parseTimeToMinutes(timeIn, "time_in");
	const timeOutMinutes = parseTimeToMinutes(timeOut, "time_out");

	if (timeOutMinutes <= timeInMinutes) {
		throw new AppError("time_out must be later than time_in.", 400);
	}

	const effectiveMinutes = getEffectiveWorkMinutes(timeInMinutes, timeOutMinutes);

	if (effectiveMinutes !== REQUIRED_WORK_MINUTES) {
		throw new AppError(
			"Work hours must total exactly 4 hours after accounting for the automatic lunch overlap.",
			400
		);
	}
};

const normalizeTimeRange = (timeIn: string, timeOut: string) => {
  const normalizedTimeIn = formatMinutesAsTime(
    parseTimeToMinutes(timeIn, "time_in")
  );

  const normalizedTimeOut = formatMinutesAsTime(
    parseTimeToMinutes(timeOut, "time_out")
  );

  return {
    timeIn: normalizedTimeIn,
    timeOut: normalizedTimeOut,
  };
};

const deriveClassification = (timeIn: string): string => {
	const timeInMinutes = parseTimeToMinutes(timeIn, "time_in");

	return timeInMinutes < 12 * 60 ? "Morning" : "Afternoon";
};

export const createWorkHour = asyncHandler(
	async (req: Request, res: Response) => {
		const transactedBy = getTransactedById(req);
		const { time_in, time_out, lunch_break_minutes } = req.body as {
			time_in?: string;
			time_out?: string;
			lunch_break_minutes?: number;
		};

		if (!time_in || !time_out) {
			throw new AppError("time_in and time_out are required.", 400);
		}

		validateBusinessRule(time_in, time_out);

		const normalized = normalizeTimeRange(time_in, time_out);
		const duplicate = await WorkHourModel.findByTimeRange(
			normalized.timeIn,
			normalized.timeOut
		);

		if (duplicate) {
			throw new AppError(
				"Duplicate work-hour schedule already exists for this time range.",
				409
			);
		}

		const workHour = await WorkHourModel.create({
			time_in: normalized.timeIn,
			time_out: normalized.timeOut,
			classification: deriveClassification(normalized.timeIn),
			lunch_break_minutes,
		});

		await logCrudTransaction({
			action: "Create",
			resource: "Work Hour",
			transactedBy,
			work_hour_id: workHour.work_hour_id,
		});

		res.status(201).json({
			success: true,
			message: "Work hour created successfully.",
			data: workHour,
		});
	}
);

export const getAllWorkHours = asyncHandler(
	async (_req: Request, res: Response) => {
		const workHours = await WorkHourModel.findAll();

		res.status(200).json({
			success: true,
			message: "Work hours retrieved successfully.",
			data: workHours,
		});
	}
);

export const getWorkHourById = asyncHandler(
	async (req: Request, res: Response) => {
		const id = parseId(req.params.id);
		const workHour = await WorkHourModel.findById(id);

		if (!workHour) {
			throw new AppError("Work hour not found.", 404);
		}

		res.status(200).json({
			success: true,
			message: "Work hour retrieved successfully.",
			data: workHour,
		});
	}
);

export const updateWorkHour = asyncHandler(
	async (req: Request, res: Response) => {
		const id = parseId(req.params.id);
		const existing = await WorkHourModel.findById(id);

		if (!existing) {
			throw new AppError("Work hour not found.", 404);
		}

		const { time_in, time_out, lunch_break_minutes } = req.body as {
			time_in?: string;
			time_out?: string;
			lunch_break_minutes?: number;
	};

		const finalTimeIn = time_in ?? String(existing.time_in);
		const finalTimeOut = time_out ?? String(existing.time_out);

		validateBusinessRule(finalTimeIn, finalTimeOut);

		const normalized = normalizeTimeRange(finalTimeIn, finalTimeOut);
		const duplicate = await WorkHourModel.findByTimeRangeExcludingId(
			normalized.timeIn,
			normalized.timeOut,
			id
		);

		if (duplicate) {
			throw new AppError(
				"Duplicate work-hour schedule already exists for this time range.",
				409
			);
		}

		const updatedWorkHour = await WorkHourModel.updateById(id, {
			time_in: normalized.timeIn,
			time_out: normalized.timeOut,
			lunch_break_minutes,
		});

		await logCrudTransaction({
			action: "Update",
			resource: "Work Hour",
			transactedBy: getTransactedById(req),
			work_hour_id: updatedWorkHour.work_hour_id,
		});

			res.status(200).json({
			success: true,
			message: "Work hour updated successfully.",
			data: updatedWorkHour,
		});
	}
);

export const deleteWorkHour = asyncHandler(
	async (req: Request, res: Response) => {
		const id = parseId(req.params.id);
		const existing = await WorkHourModel.findById(id);

		if (!existing) {
			throw new AppError("Work hour not found.", 404);
		}

		await logCrudTransaction({
			action: "Delete",
			resource: "Work Hour",
			transactedBy: getTransactedById(req),
			work_hour_id: id,
		});

		await prisma.$transaction(async (tx) => {
			await tx.employees.updateMany({
				where: {
					OR: [
						{ morning_work_hour_id: id },
						{ afternoon_work_hour_id: id },
					],
				},
				data: {
					morning_work_hour_id: null,
					afternoon_work_hour_id: null,
				},
			});

			await tx.transactions.updateMany({
				where: {
					work_hour_id: id,
				},
				data: {
					work_hour_id: null,
				},
			});

			await tx.work_hours.delete({
				where: { work_hour_id: id },
			});
		});

		res.status(200).json({
			success: true,
			message: "Work hour deleted successfully.",
		});
	}
);
