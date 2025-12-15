# bingwu-iconfont-updater

[![npm version](https://img.shields.io/npm/v/bingwu-iconfont-updater.svg)](https://www.npmjs.com/package/bingwu-iconfont-updater)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

自动更新阿里巴巴图标库 CSS 文件的工具，支持智能对比、自动备份和版本管理。

## ✨ 功能特性

- 🚀 **智能更新** - 自动检测文件变化，只在内容更新时执行
- 💾 **自动备份** - 保留历史版本，支持配置备份数量
- 🔄 **重定向支持** - 自动处理 HTTP 重定向
- ⏱️ **超时控制** - 可配置下载超时时间
- 🎨 **美化输出** - 使用 consola 提供友好的控制台输出
- 📦 **TypeScript** - 完整的类型定义支持
- ✅ **完善测试** - 单元测试覆盖核心功能

## 📦 安装

全局安装：

```bash
npm install -g bingwu-iconfont-updater
```

或作为项目依赖：

```bash
npm install bingwu-iconfont-updater --save-dev
# 或
pnpm add -D bingwu-iconfont-updater
# 或
yarn add -D bingwu-iconfont-updater
```

## 🚀 使用方法

### 命令行使用

基本用法：

```bash
bingwu-iconfont-updater --url https://at.alicdn.com/t/c/font_1474617_sprzss0xlhj.css
```

指定输出路径：

```bash
bingwu-iconfont-updater \
  --url https://at.alicdn.com/t/c/font_xxx.css \
  --output ./static/font/iconfont.css
```

完整参数：

```bash
bingwu-iconfont-updater \
  --url https://at.alicdn.com/t/c/font_xxx.css \
  --output ./static/font/iconfont.css \
  --backup-dir ./backup \
  --max-backups 10
```

使用配置文件：

```bash
bingwu-iconfont-updater --config iconfont.config.json
```

查看帮助：

```bash
bingwu-iconfont-updater --help
```

### 命令行参数

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--url` | `-u` | 图标库 CSS 的 URL 地址 | 必填 |
| `--output` | `-o` | 输出文件路径 | `./iconfont.css` |
| `--backup-dir` | `-b` | 备份目录 | `./backup` |
| `--max-backups` | `-m` | 最多保留的备份数量 | `5` |
| `--config` | `-c` | 配置文件路径 | - |
| `--help` | `-h` | 显示帮助信息 | - |

### 配置文件

创建 `iconfont.config.json`：

```json
{
  "url": "https://at.alicdn.com/t/c/font_1474617_sprzss0xlhj.css",
  "output": "./static/font/iconfont.css",
  "backupDir": "./static/font/backup",
  "maxBackups": 5,
  "timeout": 30000
}
```

### 编程 API

**CommonJS:**

```javascript
const IconfontUpdater = require('bingwu-iconfont-updater');

const updater = new IconfontUpdater({
  url: 'https://at.alicdn.com/t/c/font_xxx.css',
  output: './static/font/iconfont.css',
  backupDir: './static/font/backup',
  maxBackups: 5,
  timeout: 30000
});

updater.update().then(result => {
  if (result.updated) {
    console.log('✅ 更新成功');
    console.log('文件哈希:', result.hash);
    console.log('备份文件:', result.backupFile);
  } else {
    console.log('ℹ️ 文件内容未变化，无需更新');
  }
}).catch(error => {
  console.error('❌ 更新失败:', error.message);
});
```

**TypeScript:**

```typescript
import IconfontUpdater, { IconfontUpdaterConfig, UpdateResult } from 'bingwu-iconfont-updater';

const config: IconfontUpdaterConfig = {
  url: 'https://at.alicdn.com/t/c/font_xxx.css',
  output: './static/font/iconfont.css',
  backupDir: './static/font/backup',
  maxBackups: 5,
  timeout: 30000
};

const updater = new IconfontUpdater(config);

async function updateIconfont() {
  try {
    const result: UpdateResult = await updater.update();
    if (result.updated) {
      console.log('✅ 更新成功');
    } else {
      console.log('ℹ️ 无需更新');
    }
  } catch (error) {
    console.error('❌ 更新失败:', error);
  }
}

updateIconfont();
```

### 配置选项

```typescript
interface IconfontUpdaterConfig {
  url?: string;        // 图标库 CSS 的 URL 地址
  output?: string;     // 输出文件路径，默认 "./iconfont.css"
  backupDir?: string;  // 备份目录，默认 "./backup"
  maxBackups?: number; // 最多保留的备份数量，默认 5
  timeout?: number;    // 下载超时时间（毫秒），默认 30000
}
```

### 返回结果

```typescript
interface UpdateResult {
  updated: boolean;     // 是否执行了更新
  hash: string;         // 文件的 MD5 哈希值
  backupFile?: string;  // 备份文件路径（如果有）
}
```

## 📝 使用场景

### 在 npm scripts 中使用

**package.json:**

```json
{
  "scripts": {
    "update:iconfont": "bingwu-iconfont-updater --config iconfont.config.json",
    "prebuild": "npm run update:iconfont"
  }
}
```

### 在构建工具中集成

**vite.config.ts:**

```typescript
import { defineConfig } from 'vite';
import IconfontUpdater from 'bingwu-iconfont-updater';

export default defineConfig({
  plugins: [
    {
      name: 'update-iconfont',
      async buildStart() {
        const updater = new IconfontUpdater({
          url: 'https://at.alicdn.com/t/c/font_xxx.css',
          output: './src/assets/iconfont.css'
        });
        await updater.update();
      }
    }
  ]
});
```

## 🔧 工作原理

1. **下载** - 从指定 URL 下载最新的 CSS 文件
2. **对比** - 计算文件 MD5 哈希，与现有文件对比
3. **备份** - 如果内容有变化，先备份旧文件
4. **更新** - 保存新文件到指定位置
5. **清理** - 根据 `maxBackups` 清理过期备份

## 🧪 开发

克隆项目：

```bash
git clone https://github.com/yourusername/bingwu-iconfont-updater.git
cd bingwu-iconfont-updater
```

安装依赖：

```bash
pnpm install
```

开发模式（监听文件变化）：

```bash
pnpm dev
```

构建：

```bash
pnpm build
```

运行测试：

```bash
pnpm test
```

测试覆盖率：

```bash
pnpm coverage
```

## 📄 License

MIT © [Your Name]

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 反馈

如有问题或建议，请在 [GitHub Issues](https://github.com/yourusername/bingwu-iconfont-updater/issues) 中提出。
