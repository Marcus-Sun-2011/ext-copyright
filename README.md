# ext-copyright

A VS Code extension that automatically manages copyright headers in your source code files.

## Features

- **Automatic Insertion**: Automatically inserts a copyright header if one is missing when you save a file.
- **Year Update**: Detects existing copyright headers and updates the year to a range (e.g., `2020` becomes `(2020-2025)`) if the current year is different.
- **Confirmation on Save**: Optionally prompts for confirmation before making changes during a file save operation.
- **Manual Command**: Provides a command "Update Copyright Header" to manually trigger the check.
- **Customizable**: Configure different header templates for different file extensions (e.g., `//` for TS/JS, `#` for Python).

## Extension Settings

For example:
* `ext-copyright.enabled`: Enable or disable the copyright header check.
* `ext-copyright.headerText`: The default copyright header text to use if no specific extension match is found.
* `ext-copyright.confirmOnSave`: Enables a confirmation dialog before updating the copyright header on save (default: `true`).
* `ext-copyright.fileExtensions`: An array of file extensions to check (e.g., `["ts", "js", "py"]`).
* `ext-copyright.extensionHeaders`: An object mapping file extensions to specific header text. You can use comma-separated keys.

### Example Configuration

```json
{
  "ext-copyright.enabled": true,
  "ext-copyright.confirmOnSave": true,
  "ext-copyright.fileExtensions": [
    "ts",
    "js",
    "py",
    "cpp",
    "h"
  ],
  "ext-copyright.headerText": "// Copyright (c) 2025 My Company",
  "ext-copyright.extensionHeaders": {
    "ts,js": "// Copyright (c) 2025 My Company",
    "py": "# Copyright (c) 2025 My Company",
    "cpp,h,hpp": "/* Copyright (c) 2025 My Company */"
  }
}
```

## Release Notes

### 0.0.2

Added support for multi-line copyright headers, manual command execution, and improved file extension configuration.

### 0.0.1

Initial release with basic copyright header insertion and year update logic.
