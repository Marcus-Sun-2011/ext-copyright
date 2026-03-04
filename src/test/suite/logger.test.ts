import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CopyrightLogger } from '../../logger';

suite('Logger Test Suite', () => {
	let tempDir: string;
	let mockContext: vscode.ExtensionContext;

	setup(() => {
		// Create a temporary directory for the test to simulate globalStorageUri
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-ext-copyright-test-'));
		
		// Mock the ExtensionContext
		mockContext = {
			globalStorageUri: vscode.Uri.file(tempDir),
			subscriptions: [],
			workspaceState: {} as any,
			globalState: {} as any,
			extensionUri: vscode.Uri.file(tempDir),
			asAbsolutePath: (relativePath: string) => path.join(tempDir, relativePath),
			storageUri: vscode.Uri.file(tempDir),
			logUri: vscode.Uri.file(path.join(tempDir, 'log')),
			extensionMode: vscode.ExtensionMode.Test
		}  as unknown as vscode.ExtensionContext;
	});

	teardown(() => {
		// Clean up the temporary directory
		try {
			if (fs.existsSync(tempDir)) {
				fs.rmSync(tempDir, { recursive: true, force: true });
			}
		} catch (err) {
			console.error('Error cleaning up temp dir:', err);
		}
	});

	test('Logger creates log file on initialization', () => {
		new CopyrightLogger(mockContext);
		const logFile = path.join(tempDir, 'copyright-operations.log');
		assert.ok(fs.existsSync(logFile), 'Log file should be created');
	});

	test('logDetectionFailure writes correct JSON entry', () => {
		const logger = new CopyrightLogger(mockContext);
		const filePath = '/path/to/test/file.ts';
		const snippet = 'const x = 1;';

		logger.logDetectionFailure(filePath, snippet);

		const logFile = path.join(tempDir, 'copyright-operations.log');
		const content = fs.readFileSync(logFile, 'utf8');
		const lines = content.trim().split('\n');
		
		assert.strictEqual(lines.length, 1, 'Should have one log entry');
		const entry = JSON.parse(lines[0]);
		
		assert.strictEqual(entry.type, 'DETECTION_MISSING_HEADER');
		assert.strictEqual(entry.filePath, filePath);
		assert.strictEqual(entry.contentSnippet, snippet);
		assert.ok(entry.timestamp, 'Timestamp should be present');
	});

	test('logRejection writes correct JSON entry', () => {
		const logger = new CopyrightLogger(mockContext);
		const filePath = '/path/to/test/file.ts';
		const type = 'INSERT';
		const details = '// Copyright 2023';

		logger.logRejection(filePath, type, details);

		const logFile = path.join(tempDir, 'copyright-operations.log');
		const content = fs.readFileSync(logFile, 'utf8');
		const lines = content.trim().split('\n');

		assert.strictEqual(lines.length, 1, 'Should have one log entry');
		const entry = JSON.parse(lines[0]);

		assert.strictEqual(entry.type, 'USER_REJECTION');
		assert.strictEqual(entry.detectionType, type);
		assert.strictEqual(entry.filePath, filePath);
		assert.strictEqual(entry.replacementDetails, details);
		assert.ok(entry.timestamp, 'Timestamp should be present');
	});

	test('Logger appends to existing file', () => {
		const logFile = path.join(tempDir, 'copyright-operations.log');
		fs.writeFileSync(logFile, '{"previous":"entry"}\n');

		const logger = new CopyrightLogger(mockContext);
		logger.logDetectionFailure('file.ts', 'snippet');

		const content = fs.readFileSync(logFile, 'utf8');
		const lines = content.trim().split('\n');
		
		assert.strictEqual(lines.length, 2, 'Should have two log entries');
		assert.strictEqual(JSON.parse(lines[0]).previous, 'entry');
		assert.strictEqual(JSON.parse(lines[1]).type, 'DETECTION_MISSING_HEADER');
	});
});