<h1 align="center">🔁 re-pro</h1>
<p align="center">Notion / Unsplash 图像反向代理 · 部署至 Netlify 或 Cloudflare Workers · 支持白名单配置</p>

<p align="center">
  <a href="https://www.netlify.com"><img src="https://img.shields.io/badge/Deploy-Netlify-brightgreen?style=flat-square" alt="Deploy to Netlify"></a>
  <a href="https://workers.cloudflare.com/"><img src="https://img.shields.io/badge/Cloudflare-Workers-orange?style=flat-square" alt="Cloudflare Workers"></a>
  <img src="https://img.shields.io/badge/CORS%20proxy-enabled-blueviolet?style=flat-square" />
</p>

---

## 📌 项目简介

`re-pro` 是一个轻量级反向代理服务，可加速访问 Notion、Unsplash 等图床资源，解决中国大陆的加载缓慢与跨域失败问题。

⚠️ **不推荐使用 Vercel 部署**，其网络策略限制常导致图片加载失败。  
👉 若你需要完全开放代理反代任意网站，请查看：[完全开放版分支](https://github.com/wob25/re-pro/tree/re-pro_completely-open)

---

## ✨ 核心特性

- 🔀 支持将 `/proxy/<目标地址>` 代理转发为真实请求
- 🛡 自动添加 `Access-Control-Allow-Origin: *`，解决跨域问题
- 🧩 支持部署至 Netlify、Cloudflare Workers，结构清晰，易于集成
- 🔧 可通过配置白名单限制允许代理的目标域名

---

## 🚀 使用示例

将目标链接通过 `encodeURIComponent()` 编码后访问：

```bash
# ✅ 推荐格式（路径型）
https://your-site.netlify.app/proxy/https%3A%2F%2Fimages.unsplash.com%2Fphoto-xxx

# 🔁 可选格式（查询参数）
https://your-site.netlify.app/proxy?url=https%3A%2F%2Fimages.unsplash.com%2Fphoto-xxx
```

Cloudflare Workers 也支持相同格式，换成绑定的自定义域名即可。

---

## 🧰 如何修改白名单

项目使用 `ALLOWED_DOMAINS` 数组来控制可代理的目标网站，默认仅允许 Notion 与 Unsplash。如果你希望增加如 jsDelivr、GitHub CDN、Wikipedia 等：

### Netlify 版本

文件路径：
```bash
netlify/functions/proxy.js
```

修改部分：
```js
// ✅ 白名单域名（此处添加你允许代理的域名）
const ALLOWED_DOMAINS = [
  'notion.so',
  'file.notion.so',
  'images.unsplash.com',
  'cdn.jsdelivr.net',              // ← 示例：添加 jsDelivr
  'avatars.githubusercontent.com'  // ← 示例：添加 GitHub 头像 CDN
];
```

---

### Cloudflare Workers 版本

文件路径：
```bash
cf-worker/workers.js
```

修改部分：
```js
// ✅ 允许代理的目标域名（子域名自动匹配）
const ALLOWED_DOMAINS = [
  'notion.so',
  'file.notion.so',
  'images.unsplash.com',
  'cdn.jsdelivr.net',         // ← 示例：添加 jsDelivr
  'wikipedia.org'             // ← 示例：添加 Wikipedia
];
```

---

## 🌐 注意：Cloudflare Workers 在中国大陆可能无法访问

默认生成的 `*.workers.dev` 域名在部分中国网络中会遭遇 DNS 污染或阻断。

### ✅ 解决方案：绑定自定义域名

1. 在 Cloudflare 为你的 Worker 配置绑定域名（如 `img.example.com`）
2. 添加对应 DNS CNAME 记录
3. 配置路由映射至你的 Worker 服务

访问方式变为更稳定的：

```
https://img.example.com/proxy/https%3A%2F%2Fimages.unsplash.com%2Fphoto-xxx
```

---

## 📁 项目结构

```bash
re-pro/
├── cf-worker/
│   └── workers.js              # Cloudflare Worker 脚本
├── netlify/
│   └── functions/
│       └── proxy.js            # Netlify Function 脚本
├── netlify.toml                # Netlify 路由重写配置
├── package.json                # 项目元信息（可选）
└── README.md                   # 当前文档
```

---

## 📄 License

[MIT](./LICENSE) © [wob25](https://github.com/wob25)

> 本项目仅供个人或受控环境使用，部署使用请确保了解可能带来的网络风险与平台责任。
