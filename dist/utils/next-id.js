"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextIdFromMax = nextIdFromMax;
async function nextIdFromMax(getMax) {
    const maxValue = await getMax();
    return (maxValue ?? 0) + 1;
}
