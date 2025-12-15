import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import IconfontUpdater from "../lib/updater";
import * as fs from "fs";
import * as https from "https";
import * as http from "http";
import { EventEmitter } from "events";

// Mock modules
vi.mock("fs");
vi.mock("https");
vi.mock("http");
vi.mock("consola", () => ({
  consola: {
    box: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    start: vi.fn(),
    log: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("IconfontUpdater", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("构造函数", () => {
    it("应该使用默认配置", () => {
      const updater = new IconfontUpdater();
      expect(updater).toBeDefined();
    });

    it("应该接受自定义配置", () => {
      const config = {
        url: "https://at.alicdn.com/t/c/font_1474617_sprzss0xlhj.css",
        output: "./custom/path.css",
        backupDir: "./custom-backup",
        maxBackups: 10,
        timeout: 60000,
      };
      const updater = new IconfontUpdater(config);
      expect(updater).toBeDefined();
    });
  });

  describe("getFileHash", () => {
    it("应该返回正确的 MD5 hash", () => {
      const updater = new IconfontUpdater();
      // Access private method through type assertion
      const hash = (updater as any).getFileHash("test content");
      expect(hash).toBe("9a0364b9e99bb480dd25e1f0284c8555");
    });

    it("对于相同内容应该返回相同的 hash", () => {
      const updater = new IconfontUpdater();
      const content = "same content";
      const hash1 = (updater as any).getFileHash(content);
      const hash2 = (updater as any).getFileHash(content);
      expect(hash1).toBe(hash2);
    });
  });

  describe("ensureDir", () => {
    it("当目录不存在时应该创建目录", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);

      const updater = new IconfontUpdater();
      (updater as any).ensureDir("/test/path");

      expect(fs.mkdirSync).toHaveBeenCalledWith("/test/path", {
        recursive: true,
      });
    });

    it("当目录已存在时不应该创建目录", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const updater = new IconfontUpdater();
      (updater as any).ensureDir("/test/path");

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe("readExistingFile", () => {
    it("当文件存在时应该返回文件内容", () => {
      const content = "file content";
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(content);

      const updater = new IconfontUpdater({ output: "./test.css" });
      const result = (updater as any).readExistingFile();

      expect(result).toBe(content);
      expect(fs.readFileSync).toHaveBeenCalledWith("./test.css", "utf8");
    });

    it("当文件不存在时应该返回 null", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const updater = new IconfontUpdater({ output: "./test.css" });
      const result = (updater as any).readExistingFile();

      expect(result).toBeNull();
    });

    it("当读取文件出错时应该返回 null", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("Read error");
      });

      const updater = new IconfontUpdater({ output: "./test.css" });
      const result = (updater as any).readExistingFile();

      expect(result).toBeNull();
    });
  });

  describe("downloadCSS", () => {
    it("应该成功下载 HTTPS 内容", async () => {
      const mockResponse = new EventEmitter() as any;
      mockResponse.statusCode = 200;
      mockResponse.setEncoding = vi.fn();

      const mockRequest = new EventEmitter() as any;
      mockRequest.setTimeout = vi.fn();

      vi.mocked(https.get).mockImplementation((url: any, callback: any) => {
        callback(mockResponse);
        setTimeout(() => {
          mockResponse.emit("data", "test ");
          mockResponse.emit("data", "content");
          mockResponse.emit("end");
        }, 0);
        return mockRequest;
      });

      const updater = new IconfontUpdater();
      const result = await (updater as any).downloadCSS(
        "https://at.alicdn.com/t/c/font_1474617_sprzss0xlhj.css"
      );

      expect(result).toBe("test content");
    });

    it("应该成功下载 HTTP 内容", async () => {
      const mockResponse = new EventEmitter() as any;
      mockResponse.statusCode = 200;
      mockResponse.setEncoding = vi.fn();

      const mockRequest = new EventEmitter() as any;
      mockRequest.setTimeout = vi.fn();

      vi.mocked(http.get).mockImplementation((url: any, callback: any) => {
        callback(mockResponse);
        setTimeout(() => {
          mockResponse.emit("data", "http content");
          mockResponse.emit("end");
        }, 0);
        return mockRequest;
      });

      const updater = new IconfontUpdater();
      const result = await (updater as any).downloadCSS(
        "http://at.alicdn.com/t/c/font_1474617_sprzss0xlhj.css"
      );

      expect(result).toBe("http content");
    });

    it("应该处理重定向", async () => {
      const mockRedirectResponse = new EventEmitter() as any;
      mockRedirectResponse.statusCode = 302;
      mockRedirectResponse.headers = {
        location: "https://redirect.com/test.css",
      };
      mockRedirectResponse.setEncoding = vi.fn();

      const mockFinalResponse = new EventEmitter() as any;
      mockFinalResponse.statusCode = 200;
      mockFinalResponse.setEncoding = vi.fn();

      const mockRequest = new EventEmitter() as any;
      mockRequest.setTimeout = vi.fn();

      let callCount = 0;
      vi.mocked(https.get).mockImplementation((url: any, callback: any) => {
        if (callCount === 0) {
          callCount++;
          callback(mockRedirectResponse);
        } else {
          callback(mockFinalResponse);
          setTimeout(() => {
            mockFinalResponse.emit("data", "redirected content");
            mockFinalResponse.emit("end");
          }, 0);
        }
        return mockRequest;
      });

      const updater = new IconfontUpdater();
      const result = await (updater as any).downloadCSS(
        "https://at.alicdn.com/t/c/font_1474617_sprzss0xlhj.css"
      );

      expect(result).toBe("redirected content");
    });

    it("当状态码不是 200 时应该抛出错误", async () => {
      const mockResponse = new EventEmitter() as any;
      mockResponse.statusCode = 404;
      mockResponse.setEncoding = vi.fn();

      const mockRequest = new EventEmitter() as any;
      mockRequest.setTimeout = vi.fn();

      vi.mocked(https.get).mockImplementation((url: any, callback: any) => {
        callback(mockResponse);
        return mockRequest;
      });

      const updater = new IconfontUpdater();
      await expect(
        (updater as any).downloadCSS(
          "https://at.alicdn.com/t/c/font_1474617_sprzss0xlhj.css"
        )
      ).rejects.toThrow("下载失败: HTTP 404");
    });

    it("当内容为空时应该抛出错误", async () => {
      const mockResponse = new EventEmitter() as any;
      mockResponse.statusCode = 200;
      mockResponse.setEncoding = vi.fn();

      const mockRequest = new EventEmitter() as any;
      mockRequest.setTimeout = vi.fn();

      vi.mocked(https.get).mockImplementation((url: any, callback: any) => {
        callback(mockResponse);
        setTimeout(() => {
          mockResponse.emit("end");
        }, 0);
        return mockRequest;
      });

      const updater = new IconfontUpdater();
      await expect(
        (updater as any).downloadCSS(
          "https://at.alicdn.com/t/c/font_1474617_sprzss0xlhj.css"
        )
      ).rejects.toThrow("下载的文件内容为空");
    });
  });

  describe("saveCSS", () => {
    it("应该成功保存文件", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.writeFile).mockImplementation((path, data, encoding, cb) => {
        (cb as any)(null);
      });

      const updater = new IconfontUpdater({ output: "./test.css" });
      await expect(
        (updater as any).saveCSS("test content")
      ).resolves.toBeUndefined();

      expect(fs.writeFile).toHaveBeenCalledWith(
        "./test.css",
        "test content",
        "utf8",
        expect.any(Function)
      );
    });

    it("当写入失败时应该抛出错误", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.writeFile).mockImplementation((path, data, encoding, cb) => {
        (cb as any)(new Error("Write error"));
      });

      const updater = new IconfontUpdater({ output: "./test.css" });
      await expect((updater as any).saveCSS("test content")).rejects.toThrow(
        "Write error"
      );
    });
  });
});
