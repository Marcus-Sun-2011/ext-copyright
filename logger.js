"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopyrightLogger = void 0;
const vscode = require("vscode");
class CopyrightLogger {
    constructor(context) {
        this.channel = vscode.window.createOutputChannel('Ext Copyright');
        context.subscriptions.push(this.channel);
    }
    logDetectionFailure(fileName, snippet) {
        this.channel.appendLine(`[Detection Failure] File: ${fileName}`);
        this.channel.appendLine(`Snippet start:\n${snippet}\n---`);
    }
    logRejection(fileName, type, newText) {
        this.channel.appendLine(`[Rejection] File: ${fileName}, Type: ${type}`);
        this.channel.appendLine(`Proposed Text: ${newText}`);
    }
}
exports.CopyrightLogger = CopyrightLogger;
//# sourceMappingURL=logger.js.map