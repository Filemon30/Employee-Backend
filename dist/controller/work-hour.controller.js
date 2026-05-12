"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWorkHour = exports.updateWorkHour = exports.getWorkHourById = exports.getAllWorkHours = exports.createWorkHour = void 0;
const work_hour_model_1 = require("../models/work-hour.model");
const http_1 = require("../utils/http");
const REQUIRED_WORK_MINUTES = 8 * 60;
const LUNCH_START_MINUTE = 12 * 60;
const LUNCH_END_MINUTE = 13 * 60;
const parseId = (rawId) => {
    const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);
    if (!id || Number.isNaN(id)) {
        throw new http_1.AppError("Invalid work hour ID.", 400);
    }
    return id;
};
const extractTimePortion = (raw) => {
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
const normalizeRawTime = (rawTime, field) => {
    if (typeof rawTime !== "string" || !rawTime.trim()) {
        throw new http_1.AppError(`${field} is required.`, 400);
    }
    return extractTimePortion(rawTime);
};
const parseTimeToMinutes = (rawTime, fieldName) => {
    const cleaned = normalizeRawTime(rawTime, fieldName).toUpperCase();
    const twentyFourHour = /^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
    const twelveHour = /^(?:0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/;
    if (twentyFourHour.test(cleaned)) {
        const [hourText, minuteText] = cleaned.split(":");
        return Number(hourText) * 60 + Number(minuteText);
    }
    if (twelveHour.test(cleaned)) {
        const match = cleaned.match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/);
        if (!match)
            throw new http_1.AppError(`Invalid ${fieldName} format.`, 400);
        const hour = Number(match[1]);
        const minute = Number(match[2]);
        const period = match[3];
        const normalizedHour = period === "AM" ? hour % 12 : (hour % 12) + 12;
        return normalizedHour * 60 + minute;
    }
    throw new http_1.AppError(`${fieldName} must be in HH:mm, HH:mm:ss, or h:mm AM/PM format.`, 400);
};
const formatMinutesAsTime = (minutes) => {
    const normalizedHours = Math.floor(minutes / 60)
        .toString()
        .padStart(2, "0");
    const normalizedMinutes = (minutes % 60).toString().padStart(2, "0");
    return `${normalizedHours}:${normalizedMinutes}`;
};
const getEffectiveWorkMinutes = (timeInMinutes, timeOutMinutes) => {
    if (timeOutMinutes <= timeInMinutes) {
        throw new http_1.AppError("time_out must be later than time_in.", 400);
    }
    const totalMinutes = timeOutMinutes - timeInMinutes;
    const lunchOverlap = Math.max(0, Math.min(timeOutMinutes, LUNCH_END_MINUTE) -
        Math.max(timeInMinutes, LUNCH_START_MINUTE));
    return totalMinutes - lunchOverlap;
};
const validateBusinessRule = (timeIn, timeOut) => {
    const timeInMinutes = parseTimeToMinutes(timeIn, "time_in");
    const timeOutMinutes = parseTimeToMinutes(timeOut, "time_out");
    const effectiveMinutes = getEffectiveWorkMinutes(timeInMinutes, timeOutMinutes);
    if (effectiveMinutes !== REQUIRED_WORK_MINUTES) {
        throw new http_1.AppError("Work hours must total exactly 8 hours excluding the 12:00-1:00 PM lunch break.", 400);
    }
};
const normalizeTimeRange = (timeIn, timeOut) => {
    const normalizedTimeIn = formatMinutesAsTime(parseTimeToMinutes(timeIn, "time_in"));
    const normalizedTimeOut = formatMinutesAsTime(parseTimeToMinutes(timeOut, "time_out"));
    return {
        timeIn: normalizedTimeIn,
        timeOut: normalizedTimeOut,
    };
};
exports.createWorkHour = (0, http_1.asyncHandler)(async (req, res) => {
    const { time_in, time_out } = req.body;
    if (!time_in || !time_out) {
        throw new http_1.AppError("time_in and time_out are required.", 400);
    }
    validateBusinessRule(time_in, time_out);
    const normalized = normalizeTimeRange(time_in, time_out);
    const duplicate = await work_hour_model_1.WorkHourModel.findByTimeRange(normalized.timeIn, normalized.timeOut);
    if (duplicate) {
        throw new http_1.AppError("Duplicate work-hour schedule already exists for this time range.", 409);
    }
    const workHour = await work_hour_model_1.WorkHourModel.create({
        time_in: normalized.timeIn,
        time_out: normalized.timeOut,
    });
    res.status(201).json({
        success: true,
        message: "Work hour created successfully.",
        data: workHour,
    });
});
exports.getAllWorkHours = (0, http_1.asyncHandler)(async (_req, res) => {
    const workHours = await work_hour_model_1.WorkHourModel.findAll();
    res.status(200).json({
        success: true,
        message: "Work hours retrieved successfully.",
        data: workHours,
    });
});
exports.getWorkHourById = (0, http_1.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    const workHour = await work_hour_model_1.WorkHourModel.findById(id);
    if (!workHour) {
        throw new http_1.AppError("Work hour not found.", 404);
    }
    res.status(200).json({
        success: true,
        message: "Work hour retrieved successfully.",
        data: workHour,
    });
});
exports.updateWorkHour = (0, http_1.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await work_hour_model_1.WorkHourModel.findById(id);
    if (!existing) {
        throw new http_1.AppError("Work hour not found.", 404);
    }
    const { time_in, time_out } = req.body;
    const finalTimeIn = time_in ?? String(existing.time_in);
    const finalTimeOut = time_out ?? String(existing.time_out);
    validateBusinessRule(finalTimeIn, finalTimeOut);
    const normalized = normalizeTimeRange(finalTimeIn, finalTimeOut);
    const duplicate = await work_hour_model_1.WorkHourModel.findByTimeRangeExcludingId(normalized.timeIn, normalized.timeOut, id);
    if (duplicate) {
        throw new http_1.AppError("Duplicate work-hour schedule already exists for this time range.", 409);
    }
    const updatedWorkHour = await work_hour_model_1.WorkHourModel.updateById(id, {
        time_in: normalized.timeIn,
        time_out: normalized.timeOut,
    });
    res.status(200).json({
        success: true,
        message: "Work hour updated successfully.",
        data: updatedWorkHour,
    });
});
exports.deleteWorkHour = (0, http_1.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await work_hour_model_1.WorkHourModel.findById(id);
    if (!existing) {
        throw new http_1.AppError("Work hour not found.", 404);
    }
    await work_hour_model_1.WorkHourModel.deleteById(id);
    res.status(200).json({
        success: true,
        message: "Work hour deleted successfully.",
    });
});
