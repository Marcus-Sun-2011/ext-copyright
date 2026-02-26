export interface YearMatch {
	existingYearRange: string;
	startIndex: number;
	endIndex: number;
}

/**
 * 在文本行中根据模式查找年份信息
 */
export function findYearMatch(lineText: string, patterns: string[]): YearMatch | undefined {
	const yearRegexStr = '(\\(?\\d{4}(?:-\\d{4})?\\)?)';

	for (const pattern of patterns) {
		const yearPlaceholderIndex = pattern.indexOf('${year}');
		if (yearPlaceholderIndex === -1) {
			continue;
		}

		// 转义模式字符串，但保留 ${year} 用于替换
		const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		// 将 ${year} 替换为年份捕获组
		const regexStr = escapedPattern.replace(/\\\$\\\{year\\\}/g, yearRegexStr);
		const regex = new RegExp(regexStr);
		const match = lineText.match(regex);

		if (match && match.index !== undefined && match[1]) {
			const existingYearRange = match[1];
			const matchIndex = match.index;
			// 找到年份在整个匹配字符串中的相对位置 (使用 pattern 中的偏移量更准确)
			const startIndex = matchIndex + yearPlaceholderIndex;

			return {
				existingYearRange,
				startIndex,
				endIndex: startIndex + existingYearRange.length
			};
		}
	}
	return undefined;
}

/**
 * 计算新的年份范围字符串
 * 如果不需要更新（即结束年份已是当前年份），返回 null
 */
export function calculateNewYearRange(existingYearRange: string, currentYear: string): string | null {
	const cleanYearRange = existingYearRange.replace(/[()]/g, '');
	const years = cleanYearRange.split('-');
	const endYear = years[years.length - 1];

	if (endYear >= currentYear) {
		return null;
	}

	const startYear = years[0];
	const hasParens = existingYearRange.includes('(');
	
	// 保持原有逻辑：如果原年份带有括号，或者原年份只是单个年份，新范围加上括号
	const newYearRange = (hasParens || years.length === 1) ? `(${startYear}-${currentYear})` : `${startYear}-${currentYear}`;

	return newYearRange;
}