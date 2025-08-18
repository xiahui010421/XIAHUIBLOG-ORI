---
title: Extension-xml-uuid
date: 2025-08-18T13:35:00.000Z
tags: [blog]
categories: blog
---

# XML UUID Hover 插件操作指南（清晰版）

## 1️⃣ 准备环境

```bash
# 查看 Node.js 和 npm 版本
node -v
npm -v
```

确保 Node.js >=18、npm 可用。

---

## 2️⃣ 安装 VS Code 插件开发工具

```bash
npm i -g yo generator-code
```

> 如果报权限错误，请加 `sudo`：`sudo npm i -g yo generator-code`

---

## 3️⃣ 创建插件工程

```bash
yo code
```

* 选择 **New Extension (TypeScript)**
* Extension name：`xml-uuid-hover`
* 其他选项一路回车（默认即可）

进入工程目录：

```bash
cd xml-uuid-hover
```

安装依赖：

```bash
npm i
```

---

## 4️⃣ 安装 CSV 解析库

```bash
npm i csv-parse
```

---

## 5️⃣ 创建 CSV 文件

在工程根目录新建 `translations.csv`，示例内容：

```csv
UUID,English,Chinese
00000001,open,打开
00000002,close,关闭
00000003,start,开始
```

---

## 6️⃣ 修改 `package.json`

### 1. activationEvents

```json
"activationEvents": [
  "onLanguage:xml",
  "onCommand:xml-uuid-hover.reloadTranslations"
],
```

### 2. contributes

```jsonc
"contributes": {
  "configuration": {
    "title": "XML UUID Hover",
    "properties": {
      "xmlUuidHover.csvPath": {
        "type": "string",
        "default": "translations.csv",
        "description": "CSV 文件路径（绝对路径或相对工作区根目录）"
      }
    }
  },
  "commands": [
    {
      "command": "xml-uuid-hover.reloadTranslations",
      "title": "XML UUID Hover: 重新加载翻译 CSV"
    }
  ]
}
```

---

## 7️⃣ 替换 `src/extension.ts`

```ts
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";

let translationMap = new Map<string, string>();

function resolveCsvPath(userPath: string): string {
    if (!userPath?.trim()) return "";
    if (path.isAbsolute(userPath)) return userPath;
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
    return path.join(root, userPath);
}

function loadTranslation(filePathSetting: string) {
    try {
        const finalPath = resolveCsvPath(filePathSetting);

        if (!finalPath) {
            vscode.window.showWarningMessage("未配置 CSV 路径（xmlUuidHover.csvPath）。");
            translationMap.clear();
            return;
        }
        if (!fs.existsSync(finalPath)) {
            vscode.window.showWarningMessage(`CSV 文件不存在：${finalPath}`);
            translationMap.clear();
            return;
        }

        const content = fs.readFileSync(finalPath, "utf-8");
        const records: any[] = parse(content, { columns: true, skip_empty_lines: true });

        translationMap.clear();
        for (const row of records) {
            const key = String(row.UUID || "").trim();
            const zh = String(row.Chinese || "").trim();
            const en = String(row.English || "").trim();
            if (key) translationMap.set(key, zh || en || "");
        }

        console.log(`[xml-uuid-hover] Translation loaded: ${translationMap.size}`);
        vscode.window.setStatusBarMessage(`XML UUID Hover: 已加载 ${translationMap.size} 条翻译`, 2000);
    } catch (e) {
        console.error("[xml-uuid-hover] Failed to load CSV:", e);
        vscode.window.showErrorMessage(`加载 CSV 失败：${String((e as Error).message || e)}`);
        translationMap.clear();
    }
}

export function activate(context: vscode.ExtensionContext) {
    const getCsvSetting = () =>
        vscode.workspace.getConfiguration("xmlUuidHover").get<string>("csvPath") || "translations.csv";

    // 初次加载
    let csvPathSetting = getCsvSetting();
    loadTranslation(csvPathSetting);

    // Hover Provider
    const hoverProvider = vscode.languages.registerHoverProvider("xml", {
        provideHover(document, position) {
            const range = document.getWordRangeAtPosition(position, /[0-9A-Fa-f]{8,}/);
            if (!range) return;
            const word = document.getText(range);
            if (translationMap.has(word)) {
                return new vscode.Hover(`翻译: ${translationMap.get(word)}`);
            }
        },
    });
    context.subscriptions.push(hoverProvider);

    // 手动刷新命令
    const reloadCmd = vscode.commands.registerCommand("xml-uuid-hover.reloadTranslations", () => {
        csvPathSetting = getCsvSetting();
        loadTranslation(csvPathSetting);
        vscode.window.showInformationMessage("翻译 CSV 已重新加载！");
    });
    context.subscriptions.push(reloadCmd);

    // 设置变更时自动重载
    const cfgWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("xmlUuidHover.csvPath")) {
            csvPathSetting = getCsvSetting();
            loadTranslation(csvPathSetting);
            vscode.window.showInformationMessage("翻译 CSV 路径已更新并重新加载。");
        }
    });
    context.subscriptions.push(cfgWatcher);
}

export function deactivate() {}
```

---

## 8️⃣ 运行插件

1. 打开 VS Code → 打开插件工程
2. 按 F5 启动 **Extension Development Host**
3. 在新窗口里打开 `.xml` 文件，写入：

```xml
<button text="00000001"/>
```

4. 鼠标悬停在 `00000001` 上，会显示翻译：`翻译: 打开`

---

## 9️⃣ 打包插件

```bash
# 本地安装 vsce（推荐）
npm install --save-dev vsce

# 打包
npx vsce package
```

生成 `.vsix` 文件，可以在 VS Code 扩展面板 → … → Install from VSIX 安装。
