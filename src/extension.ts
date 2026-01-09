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

		const headerTextConfig = resolveCopyrightHeader(config, fileExt);
		const headerText = Array.isArray(headerTextConfig) ? headerTextConfig.join('\n') : (headerTextConfig || '');

		if (headerText) {
			const result = getCopyrightEdit(editor.document, headerText);
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

		const headerTextConfig = resolveCopyrightHeader(config, fileExt);
		const headerText = Array.isArray(headerTextConfig) ? headerTextConfig.join('\n') : (headerTextConfig || '');

		if (enabled && headerText) {
			if (fileExtensions && fileExtensions.length > 0) {

				if (!fileExtensions.some(ext => ext.toLowerCase() === fileExt)) {
					return;
				}
			}

			const result = getCopyrightEdit(event.document, headerText);

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
							const freshResult = getCopyrightEdit(event.document, headerText);
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

function getCopyrightEdit(document: vscode.TextDocument, headerText: string): { edit: vscode.TextEdit, message: string } | undefined {
	const text = document.getText();
	const currentYear = new Date().getFullYear().toString();
	let match = null;
	let templateYear = null;
	const hasYearPlaceholder = headerText.includes('${year}');

	// 查找配置中的任意4位年份，而不仅仅是当前年份
	const yearMatch = !hasYearPlaceholder ? headerText.match(/\b((?:19|20)\d{2})\b/) : null;

	// 将 headerText 按行分割并转义，然后用 \r?\n 连接，以支持跨平台换行符匹配
	const lines = headerText.split(/\r?\n/);
	const escapedLines = lines.map(line => line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
	let escapedHeaderText = escapedLines.join('\\r?\\n');

	const yearPattern = '(\\(?\\d{4}(?:-\\d{4})?\\)?)';
	if (hasYearPlaceholder) {
		// 在转义后的文本中，${year} 变成了 \$\{year\}，我们需要将其替换为正则捕获组
		escapedHeaderText = escapedHeaderText.replace(/\\\$\\\{year\\\}/g, yearPattern);
	} else if (yearMatch) {
		templateYear = yearMatch[1];
		escapedHeaderText = escapedHeaderText.replace(templateYear, yearPattern);
	}

	const headerRegex = new RegExp('^' + escapedHeaderText);
	match = text.match(headerRegex);

	if (match && (hasYearPlaceholder || templateYear)) {
		const existingYearRange = match[1];
		const cleanYearRange = existingYearRange.replace(/[()]/g, '');
		const years = cleanYearRange.split('-');
		const endYear = years[years.length - 1];

		if (endYear !== currentYear) {
			const startYear = years[0];
			const hasParens = existingYearRange.includes('(');
			const newYearRange = (hasParens || years.length === 1) ? `(${startYear}-${currentYear})` : `${startYear}-${currentYear}`;

			// 使用匹配到的文本来计算位置，确保在多行和不同换行符下位置准确
			const yearIndexInMatch = match[0].indexOf(existingYearRange);
			const startPos = document.positionAt(match.index! + yearIndexInMatch);
			const endPos = document.positionAt(match.index! + yearIndexInMatch + existingYearRange.length);

			const edit = vscode.TextEdit.replace(new vscode.Range(startPos, endPos), newYearRange);
			const message = `Update copyright year from "${existingYearRange}" to "${newYearRange}"?`;
			return { edit, message };
		}
	} else {
		let textToInsert = headerText;
		if (hasYearPlaceholder) {
			textToInsert = textToInsert.replace(/\$\{year\}/g, currentYear);
		} else if (templateYear) {
			textToInsert = headerText.replace(templateYear, currentYear);
		}

		if (!text.startsWith(textToInsert)) {
			const edit = vscode.TextEdit.insert(new vscode.Position(0, 0), textToInsert + '\n');
			const message = 'Insert missing copyright header?';
			return { edit, message };
		}
	}
	return undefined;
}
