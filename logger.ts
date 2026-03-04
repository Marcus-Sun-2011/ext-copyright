import * as vscode from 'vscode';

export class CopyrightLogger {
    private channel: vscode.OutputChannel;

    constructor(context: vscode.ExtensionContext) {
        this.channel = vscode.window.createOutputChannel('Ext Copyright');
        context.subscriptions.push(this.channel);
    }

    logDetectionFailure(fileName: string, snippet: string) {
        this.channel.appendLine(`[Detection Failure] File: ${fileName}`);
        this.channel.appendLine(`Snippet start:\n${snippet}\n---`);
    }

    logRejection(fileName: string, type: string, newText: string) {
        this.channel.appendLine(`[Rejection] File: ${fileName}, Type: ${type}`);
        this.channel.appendLine(`Proposed Text: ${newText}`);
    }
}
