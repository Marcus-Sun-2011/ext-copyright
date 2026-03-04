import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class CopyrightLogger {
	private logFile: string | undefined;

	constructor(context: vscode.ExtensionContext) {
		// Use global storage to keep a central log file
		const storageUri = context.globalStorageUri;
		if (storageUri) {
			const storagePath = storageUri.fsPath;
			if (!fs.existsSync(storagePath)) {
				fs.mkdirSync(storagePath, { recursive: true });
			}
			this.logFile = path.join(storagePath, 'copyright-operations.log');
			this.rotateLog();
		}
	}

	/**
	 * Regularly organize and clear logs (simple rotation based on size)
	 */
	private rotateLog() {
		if (!this.logFile || !fs.existsSync(this.logFile)) {
			return;
		}
		try {
			const stats = fs.statSync(this.logFile);
			// If log file is larger than 5MB, rotate it
			if (stats.size > 5 * 1024 * 1024) {
				const backupPath = this.logFile + '.old';
				if (fs.existsSync(backupPath)) {
					fs.unlinkSync(backupPath);
				}
				fs.renameSync(this.logFile, backupPath);
			}
		} catch (e) {
			console.error('Error rotating copyright log:', e);
		}
	}

	/**
	 * Log when no header is detected (and an insertion is proposed)
	 */
	public logDetectionFailure(filePath: string, fileContentSnippet: string) {
		this.appendLog({
			timestamp: new Date().toISOString(),
			type: 'DETECTION_MISSING_HEADER',
			filePath,
			contentSnippet: fileContentSnippet
		});
	}

	/**
	 * Log when a user manually rejects a change
	 */
	public logRejection(filePath: string, detectionType: 'INSERT' | 'UPDATE', replacementDetails: string) {
		this.appendLog({
			timestamp: new Date().toISOString(),
			type: 'USER_REJECTION',
			detectionType,
			filePath,
			replacementDetails
		});
	}

	private appendLog(data: any) {
		if (!this.logFile) { return; }
		try {
			fs.appendFileSync(this.logFile, JSON.stringify(data) + '\n');
		} catch (e) {
			console.error('Error writing to copyright log:', e);
		}
	}
}