// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ext-copyright" is now active!');

	const resolveCopyrightHeader = (config: vscode.WorkspaceConfiguration, fileExt: string): string | string[] | undefined => {
		const extensionHeadersInspect = config.inspect<Record<string, string | string[]>>('extensionHeaders');
		const headerTextInspect = config.inspect<string | string[]>('headerText');

		// 1. 优先检查用户自定义的特定文件后缀配置 (WorkspaceFolder -> Workspace -> Global)
		const userExtensionHeaderSources = [
			extensionHeadersInspect?.workspaceFolderValue,
			extensionHeadersInspect?.workspaceValue,
			extensionHeadersInspect?.globalValue
		];

		for (const source of userExtensionHeaderSources) {
			if (source) {
				for (const [key, value] of Object.entries(source)) {
					if (key.split(',').map(k => k.trim().toLowerCase()).includes(fileExt)) {
						return value;
					}
				}
			}
		}

		// 2. 检查用户自定义的全局配置 (headerText)
		// 如果用户显式设置了 headerText 且不为空，则使用它
		const userHeaderText = headerTextInspect?.workspaceFolderValue ?? headerTextInspect?.workspaceValue ?? headerTextInspect?.globalValue;
		if (userHeaderText !== undefined) {
			const isEmpty = userHeaderText === '' || (Array.isArray(userHeaderText) && userHeaderText.length === 0);
			if (!isEmpty) {
				return userHeaderText;
			}
		}

		// 3. 检查默认的特定文件后缀配置 (package.json default)
		const defaultExtensionHeaders = extensionHeadersInspect?.defaultValue;
		if (defaultExtensionHeaders) {
			for (const [key, value] of Object.entries(defaultExtensionHeaders)) {
				if (key.split(',').map(k => k.trim().toLowerCase()).includes(fileExt)) {
					return value;
				}
			}
		}

		// 4. 最后使用默认的全局配置
		return headerTextInspect?.defaultValue;
	};

	const resolveYearMatchPatterns = (config: vscode.WorkspaceConfiguration, fileExt: string): string[] => {
		const patternsInspect = config.inspect<Record<string, string[]>>('yearMatchPatterns');

		const sources = [
			patternsInspect?.workspaceFolderValue,
			patternsInspect?.workspaceValue,
			patternsInspect?.globalValue,
			patternsInspect?.defaultValue
		];

		for (const source of sources) {
			if (source) {
				for (const [key, value] of Object.entries(source)) {
					if (key.split(',').map(k => k.trim().toLowerCase()).includes(fileExt)) {
						return value;
					}
				}
			}
		}
		return [];
	};

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('ext-copyright.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from ext-copyright!');
	});

	const changeDecorationType = vscode.window.createTextEditorDecorationType({
		textDecoration: 'line-through',
		backgroundColor: new vscode.ThemeColor('diffEditor.removedTextBackground'),
		isWholeLine: false,
	});
	context.subscriptions.push(changeDecorationType);

	context.subscriptions.push(disposable);

	const manualDisposable = vscode.commands.registerCommand('ext-copyright.addCopyright', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		const config = vscode.workspace.getConfiguration('ext-copyright');

		const fileName = editor.document.fileName;
		const extIndex = fileName.lastIndexOf('.');
		const fileExt = extIndex >= 0 ? fileName.substring(extIndex + 1).toLowerCase() : '';

		const maxHeaderSearchLines = config.get<number>('maxHeaderSearchLines', 10);
		const yearMatchPatterns = resolveYearMatchPatterns(config, fileExt);
		const headerTextConfig = resolveCopyrightHeader(config, fileExt);
		const headerText = Array.isArray(headerTextConfig) ? headerTextConfig.join('\n') : (headerTextConfig || '');

		if (headerText) {
			const result = getCopyrightEdit(editor.document, headerText, maxHeaderSearchLines, yearMatchPatterns);
			if (result) {
				editor.edit(editBuilder => {
					editBuilder.replace(result.edit.range, result.edit.newText);
				});
			}
		}
	});
	context.subscriptions.push(manualDisposable);

	const ignoreNextSave = new Set<string>();

	const onSaveDisposable = vscode.workspace.onWillSaveTextDocument(event => {
		if (ignoreNextSave.has(event.document.uri.toString())) {
			return;
		}

		const config = vscode.workspace.getConfiguration('ext-copyright');
		const enabled = config.get<boolean>('enabled');
		const confirmOnSave = config.get<boolean>('confirmOnSave', true);
		const fileExtensions = config.get<string[]>('fileExtensions', []);

		const fileName = event.document.fileName;
		const extIndex = fileName.lastIndexOf('.');
		const fileExt = extIndex >= 0 ? fileName.substring(extIndex + 1).toLowerCase() : '';

		const maxHeaderSearchLines = config.get<number>('maxHeaderSearchLines', 10);
		const yearMatchPatterns = resolveYearMatchPatterns(config, fileExt);
		const headerTextConfig = resolveCopyrightHeader(config, fileExt);
		const headerText = Array.isArray(headerTextConfig) ? headerTextConfig.join('\n') : (headerTextConfig || '');

		if (enabled && headerText) {
			if (fileExtensions && fileExtensions.length > 0) {

				if (!fileExtensions.some(ext => ext.toLowerCase() === fileExt)) {
					return;
				}
			}

			const result = getCopyrightEdit(event.document, headerText, maxHeaderSearchLines, yearMatchPatterns);

			if (result) {
				const { edit, message } = result;
				if (!confirmOnSave) {
					event.waitUntil(Promise.resolve([edit]));
				} else if (event.reason === vscode.TextDocumentSaveReason.Manual) {
					const editors = vscode.window.visibleTextEditors.filter(e => e.document === event.document);
					const decorationOptions: vscode.DecorationOptions = {
						range: edit.range,
						renderOptions: {
							after: {
								contentText: edit.newText,
								backgroundColor: new vscode.ThemeColor('diffEditor.insertedTextBackground'),
								margin: '0 0 0 20px'
							}
						}
					};
					editors.forEach(editor => editor.setDecorations(changeDecorationType, [decorationOptions]));

					vscode.window.showInformationMessage(message, { modal: true }, 'Yes', 'No').then(async selection => {
						editors.forEach(editor => editor.setDecorations(changeDecorationType, []));
						if (selection === 'Yes') {
							const freshResult = getCopyrightEdit(event.document, headerText, maxHeaderSearchLines, yearMatchPatterns);
							if (freshResult) {
								const wsEdit = new vscode.WorkspaceEdit();
								wsEdit.set(event.document.uri, [freshResult.edit]);
								await vscode.workspace.applyEdit(wsEdit);
								ignoreNextSave.add(event.document.uri.toString());
								await event.document.save();
								ignoreNextSave.delete(event.document.uri.toString());
							}
						}

					});

				}
			}
		}
	});
	context.subscriptions.push(onSaveDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

function getCopyrightEdit(document: vscode.TextDocument, headerText: string, maxLines: number, matchPatterns: string[]): { edit: vscode.TextEdit, message: string } | undefined {
	const currentYear = new Date().getFullYear().toString();

	// 1. 确定用于匹配的模式列表
	let patterns: string[] = [];
	if (matchPatterns && matchPatterns.length > 0) {
		patterns = matchPatterns;
	} else {
		// 如果没有配置匹配模式，尝试从 headerText 中提取包含 ${year} 的行作为模式
		const lines = headerText.split(/\r?\n/);
		const yearLine = lines.find(line => line.includes('${year}'));
		if (yearLine) {
			patterns.push(yearLine);
		}
	}

	// 2. 在文件头部有限的行数内搜索匹配项
	const lineCount = Math.min(document.lineCount, maxLines);
	const yearRegexStr = '(\\(?\\d{4}(?:-\\d{4})?\\)?)';

	for (let i = 0; i < lineCount; i++) {
		const line = document.lineAt(i);
		const lineText = line.text;

		for (const pattern of patterns) {
			// 转义模式字符串，但保留 ${year} 用于替换
			const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			// 将 ${year} 替换为年份捕获组
			const regexStr = escapedPattern.replace(/\\\$\\\{year\\\}/g, yearRegexStr);
			const regex = new RegExp(regexStr);
			const match = lineText.match(regex);

			if (match) {
				// 发现匹配的头部行
				const existingYearRange = match[1];
				const cleanYearRange = existingYearRange.replace(/[()]/g, '');
				const years = cleanYearRange.split('-');
				const endYear = years[years.length - 1];

				if (endYear !== currentYear) {
					const startYear = years[0];
					const hasParens = existingYearRange.includes('(');
					const newYearRange = (hasParens || years.length === 1) ? `(${startYear}-${currentYear})` : `${startYear}-${currentYear}`;

					// 计算替换范围
					const matchIndex = match.index || 0;
					const yearIndexInMatch = match[0].indexOf(existingYearRange);
					const startPos = line.range.start.translate(0, matchIndex + yearIndexInMatch);
					const endPos = line.range.start.translate(0, matchIndex + yearIndexInMatch + existingYearRange.length);

					const edit = vscode.TextEdit.replace(new vscode.Range(startPos, endPos), newYearRange);
					const message = `Update copyright year from "${existingYearRange}" to "${newYearRange}"?`;
					return { edit, message };
				}

				// 头部存在且年份已是最新，无需操作
				return undefined;
			}
		}
	}

	// 3. 未检测到头部，准备插入默认头部
	let textToInsert = headerText;
	if (textToInsert.includes('${year}')) {
		textToInsert = textToInsert.replace(/\$\{year\}/g, currentYear);
	}

	// 简单检查文件开头是否已经完全包含要插入的文本（避免因模式匹配失败导致的重复插入）
	const docStart = document.getText(new vscode.Range(0, 0, lineCount + 5, 0));
	if (docStart.replace(/\r\n/g, '\n').startsWith(textToInsert.replace(/\r\n/g, '\n'))) {
		return undefined;
	}

	const edit = vscode.TextEdit.insert(new vscode.Position(0, 0), textToInsert + '\n');
	const message = 'Insert missing copyright header?';
	return { edit, message };
}
