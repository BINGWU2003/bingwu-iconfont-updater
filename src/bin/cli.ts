#!/usr/bin/env node

import IconfontUpdater, { IconfontUpdaterConfig } from "../lib/updater";
import * as path from "path";
import * as fs from "fs";

// 解析命令行参数
function parseArgs(): IconfontUpdaterConfig {
  const args = process.argv.slice(2);
  const config: IconfontUpdaterConfig = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--url" || arg === "-u") {
      config.url = args[++i];
    } else if (arg === "--output" || arg === "-o") {
      config.output = args[++i];
    } else if (arg === "--backup-dir" || arg === "-b") {
      config.backupDir = args[++i];
    } else if (arg === "--max-backups" || arg === "-m") {
      config.maxBackups = parseInt(args[++i], 10);
    } else if (arg === "--config" || arg === "-c") {
      const configFile = args[++i];
      const configPath = path.resolve(process.cwd(), configFile);
      if (fs.existsSync(configPath)) {
        const fileConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
        Object.assign(config, fileConfig);
      }
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
用法: bingwu-iconfont-updater [选项]

选项:
  -u, --url <url>              图标库CSS的URL地址
  -o, --output <path>           输出文件路径 (默认: ./iconfont.css)
  -b, --backup-dir <dir>        备份目录 (默认: ./backup)
  -m, --max-backups <number>    最多保留的备份数量 (默认: 5)
  -c, --config <file>           配置文件路径 (JSON格式)
  -h, --help                    显示帮助信息

示例:
  bingwu-iconfont-updater --url https://at.alicdn.com/t/c/font_xxx.css
  bingwu-iconfont-updater --url https://at.alicdn.com/t/c/font_xxx.css --output ./static/font/iconfont.css
  bingwu-iconfont-updater --config iconfont.config.json
      `);
      process.exit(0);
    }
  }

  return config;
}

// 主函数
async function main(): Promise<void> {
  const config = parseArgs();

  if (!config.url) {
    console.error("❌ 错误: 必须提供 --url 参数");
    console.error("使用 --help 查看帮助信息");
    process.exit(1);
  }

  const updater = new IconfontUpdater(config);

  try {
    await updater.update();
  } catch (error) {
    process.exit(1);
  }
}

main();
