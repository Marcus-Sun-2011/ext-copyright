import * as assert from 'assert';
import { findYearMatch, calculateNewYearRange } from '../../copyrightUtils';

suite('Copyright Utils Test Suite', () => {
	test('findYearMatch should find year in standard copyright header', () => {
		const line = 'Copyright (c) 2020 My Company';
		const patterns = ['Copyright (c) ${year} My Company'];
		const result = findYearMatch(line, patterns);

		assert.ok(result, 'Should find a match');
		assert.strictEqual(result?.existingYearRange, '2020');
		// "Copyright (c) " 长度为 14
		assert.strictEqual(result?.startIndex, 14);
		assert.strictEqual(result?.endIndex, 18);
	});

	test('findYearMatch should handle parens in year', () => {
		const line = '// Copyright (2019-2020) Author';
		const patterns = ['// Copyright ${year} Author'];
		const result = findYearMatch(line, patterns);

		assert.ok(result);
		assert.strictEqual(result?.existingYearRange, '(2019-2020)');
	});

	test('findYearMatch should return undefined when no match found', () => {
		const line = 'var x = 1;';
		const patterns = ['// Copyright ${year}'];
		const result = findYearMatch(line, patterns);

		assert.strictEqual(result, undefined);
	});

	test('calculateNewYearRange should update single year to range with parens', () => {
		const currentYear = '2025';
		const result = calculateNewYearRange('2020', currentYear);
		// 原有逻辑：单个年份更新后会加上括号
		assert.strictEqual(result, '(2020-2025)');
	});

	test('calculateNewYearRange should update range', () => {
		const currentYear = '2025';
		const result = calculateNewYearRange('2020-2024', currentYear);
		assert.strictEqual(result, '2020-2025');
	});

	test('calculateNewYearRange should preserve parens', () => {
		const currentYear = '2025';
		const result = calculateNewYearRange('(2020-2024)', currentYear);
		assert.strictEqual(result, '(2020-2025)');
	});

	test('calculateNewYearRange should return null if year is already current', () => {
		const currentYear = '2025';
		const result = calculateNewYearRange('2020-2025', currentYear);
		assert.strictEqual(result, null);
	});

	test('calculateNewYearRange should return null if current year is less than existing year', () => {
		const currentYear = '2020';
		// 现有年份是 2025，当前时间是 2020，不应更新
		const result = calculateNewYearRange('2025', currentYear);
		assert.strictEqual(result, null);
	});
});