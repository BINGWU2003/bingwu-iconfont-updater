# bingwu-iconfont-updater

自动更新阿里巴巴图标库CSS文件的工具

## 安装

```bash
npm install -g bingwu-iconfont-updater
```

或者作为项目依赖：

```bash
npm install bingwu-iconfont-updater --save-dev
```

## 使用方法

### 命令行使用

```bash
# 基本用法
bingwu-iconfont-updater --url https://at.alicdn.com/t/c/font_1474617_sprzss0xlhj.css

# 指定输出路径
bingwu-iconfont-updater --url https://at.alicdn.com/t/c/font_xxx.css --output ./static/font/iconfont.css

# 使用配置文件
bingwu-iconfont-updater --config iconfont.config.json
```

### 配置文件 (iconfont.config.json)

```json
{
  "url": "https://at.alicdn.com/t/c/font_1474617_sprzss0xlhj.css",
  "output": "./static/font/iconfont.css",
  "backupDir": "./static/font/backup",
  "maxBackups": 5
}
```

### 编程API

```javascript
const IconfontUpdater = require('bingwu-iconfont-updater');

const updater = new IconfontUpdater({
  url: 'https://at.alicdn.com/t/c/font_xxx.css',
  output: './static/font/iconfont.css',
  backupDir: './static/font/backup',
  maxBackups: 5
});

updater.update().then(result => {
  if (result.updated) {
    console.log('更新成功');
  } else {
    console.log('无需更新');
  }
});
```

## 功能特性

- ✅ 自动下载最新CSS文件
- ✅ 内容对比，只在变化时更新
- ✅ 自动备份，保留历史版本
- ✅ 支持重定向
- ✅ 超时处理
- ✅ 错误处理

## License

MIT

