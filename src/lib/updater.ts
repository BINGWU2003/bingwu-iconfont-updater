import * as https from "https";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { consola } from "consola";

export interface IconfontUpdaterConfig {
  url?: string;
  output?: string;
  backupDir?: string;
  maxBackups?: number;
  timeout?: number;
}

interface BackupFile {
  name: string;
  path: string;
  time: number;
}

export interface UpdateResult {
  updated: boolean;
  hash: string;
  backupFile?: string;
}

class IconfontUpdater {
  private config: Required<IconfontUpdaterConfig>;

  constructor(config: IconfontUpdaterConfig = {}) {
    this.config = {
      url: config.url || "",
      output: config.output || "./iconfont.css",
      backupDir: config.backupDir || "./backup",
      maxBackups: config.maxBackups || 5,
      timeout: config.timeout || 30000,
    };
  }

  private ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private getFileHash(content: string): string {
    return crypto.createHash("md5").update(content).digest("hex");
  }

  private readExistingFile(): string | null {
    try {
      if (fs.existsSync(this.config.output)) {
        return fs.readFileSync(this.config.output, "utf8");
      }
    } catch (error) {
      consola.warn("读取现有文件失败:", (error as Error).message);
    }
    return null;
  }

  private createBackup(): string | null {
    try {
      this.ensureDir(this.config.backupDir);
      const existingContent = this.readExistingFile();
      if (!existingContent) {
        return null;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFile = path.join(
        this.config.backupDir,
        `iconfont-${timestamp}.css`
      );
      fs.writeFileSync(backupFile, existingContent, "utf8");

      // 清理旧备份
      const backups: BackupFile[] = fs
        .readdirSync(this.config.backupDir)
        .filter((file) => file.startsWith("iconfont-") && file.endsWith(".css"))
        .map((file) => ({
          name: file,
          path: path.join(this.config.backupDir, file),
          time: fs
            .statSync(path.join(this.config.backupDir, file))
            .mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);

      if (backups.length > this.config.maxBackups) {
        backups.slice(this.config.maxBackups).forEach((backup) => {
          fs.unlinkSync(backup.path);
        });
      }

      return backupFile;
    } catch (error) {
      consola.warn("创建备份失败:", (error as Error).message);
      return null;
    }
  }

  private downloadCSS(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith("https") ? https : http;

      const request = protocol.get(url, (res) => {
        if (
          res.statusCode === 301 ||
          res.statusCode === 302 ||
          res.statusCode === 307 ||
          res.statusCode === 308
        ) {
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            consola.info(`检测到重定向: ${redirectUrl}`);
            return this.downloadCSS(
              redirectUrl.startsWith("http")
                ? redirectUrl
                : new URL(redirectUrl, url).href
            )
              .then(resolve)
              .catch(reject);
          }
        }

        if (res.statusCode !== 200) {
          reject(new Error(`下载失败: HTTP ${res.statusCode}`));
          return;
        }

        let data = "";
        res.setEncoding("utf8");

        res.on("data", (chunk: string) => {
          data += chunk;
        });

        res.on("end", () => {
          if (!data) {
            reject(new Error("下载的文件内容为空"));
            return;
          }
          resolve(data);
        });
      });

      request.on("error", (err: Error) => {
        reject(err);
      });

      request.setTimeout(this.config.timeout, () => {
        request.destroy();
        reject(new Error("下载超时"));
      });
    });
  }

  private saveCSS(content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const dir = path.dirname(this.config.output);
      this.ensureDir(dir);

      fs.writeFile(this.config.output, content, "utf8", (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async update(): Promise<UpdateResult> {
    try {
      consola.box("图标CSS自动更新工具");

      consola.info(`URL: ${this.config.url}`);
      consola.info(`输出文件: ${this.config.output}`);
      consola.log("");

      const existingContent = this.readExistingFile();
      const existingHash = existingContent
        ? this.getFileHash(existingContent)
        : null;

      if (existingContent) {
        consola.success("检测到现有文件");
      } else {
        consola.info("未找到现有文件,将创建新文件");
      }

      consola.start("开始下载最新CSS文件...");
      const startTime = Date.now();
      const cssContent = await this.downloadCSS(this.config.url);
      const downloadTime = Date.now() - startTime;

      const newHash = this.getFileHash(cssContent);
      consola.success(
        `下载完成 (耗时: ${downloadTime}ms, 大小: ${cssContent.length} 字节)`
      );

      if (existingHash === newHash) {
        consola.info("文件内容未发生变化,无需更新");
        consola.info(`更新时间: ${new Date().toLocaleString("zh-CN")}`);
        return { updated: false, hash: newHash };
      }

      consola.start("创建备份...");
      const backupFile = this.createBackup();
      if (backupFile) {
        consola.success(`备份已创建: ${path.basename(backupFile)}`);
      } else {
        consola.info("跳过备份(首次更新或备份失败)");
      }

      consola.start("保存新文件...");
      await this.saveCSS(cssContent);
      consola.success(`文件已更新: ${this.config.output}`);

      consola.success("✨ 更新成功!");
      consola.info(`更新时间: ${new Date().toLocaleString("zh-CN")}`);

      return {
        updated: true,
        hash: newHash,
        backupFile: backupFile || undefined,
      };
    } catch (error) {
      consola.error("更新失败");
      consola.error(`错误信息: ${(error as Error).message}`);
      if ((error as Error).stack) {
        consola.debug("错误堆栈:");
        consola.debug((error as Error).stack);
      }
      throw error;
    }
  }
}

export default IconfontUpdater;
