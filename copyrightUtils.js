"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findYearMatch = findYearMatch;
exports.calculateNewYearRange = calculateNewYearRange;
/**
 * Finds the copyright year pattern in a line of text.
 */
function findYearMatch(text, patterns) {
    for (const pattern of patterns) {
        // Escape regex characters except ${year}
        // Example pattern: "// Copyright (c) ${year} My Company"
        const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Replace ${year} with a capture group that matches a year or year range (e.g., 2020 or 2020-2023)
        const regexStr = escaped.replace(/\\\$\\\{year\\\}/g, '(\\d{4}(?:-\\d{4})?)');
        const regex = new RegExp(regexStr);
        const match = regex.exec(text);
        if (match && match[1]) {
            // match[1] is the captured year string
            const matchIndex = match.index + match[0].indexOf(match[1]);
            return {
                existingYearRange: match[1],
                startIndex: matchIndex,
                endIndex: matchIndex + match[1].length
            };
        }
    }
    return undefined;
}
/**
 * Calculates the new year string (e.g., "2020-2024"). Returns undefined if no update is needed.
 */
function calculateNewYearRange(existing, current) {
    if (existing === current)
        return undefined;
    if (existing.endsWith(current))
        return undefined; // Already ends with current year
    const startYear = existing.split('-')[0];
    return `${startYear}-${current}`;
}
//# sourceMappingURL=copyrightUtils.js.map