<h1 align="center">🌍 re-pro_completely-open</h1>
<p align="center">完全开放型反向代理 · 支持部署至 Netlify 和 Cloudflare Workers</p>

<p align="center">
  <a href="https://www.netlify.com/"><img src="https://img.shields.io/badge/Deploy-Netlify-brightgreen?style=flat-square" alt="Deploy to Netlify"/></a>
  <a href="https://workers.cloudflare.com/"><img src="https://img.shields.io/badge/Cloudflare-Workers-orange?style=flat-square" alt="Deploy to Cloudflare"/></a>
  <img src="https://img.shields.io/badge/CORS%20Bypass-Enabled-blueviolet?style=flat-square" alt="CORS Proxy"/>
</p>

---

## 🚨 使用前请务必阅读

> 本项目为 **完全开放的反向代理**。部署后，**任何人**只要知道你的代理地址，就能通过你的服务器访问任意网站资源。

### ⚠️ 风险说明：
1. **滥用风险高**：恶意用户可借此代理非法内容，责任归属部署者。
2. **平台限制**：Netlify / Cloudflare 多数明确禁止开放代理，可能封号。
3. **额外费用**：大量请求会迅速耗尽免费额度，触发账单或限流。
4. **法律责任**：部署者须对所有请求内容承担最终责任。

> ❗此项目仅适用于**学习用途或受控环境**，请勿公开你的代理地址。

---

## ✨ 功能概览

- 🔄 支持转发任何 URL，实现跨源资源代理
- 🌐 自动添加 `Access-Control-Allow-Origin: *` 解决 CORS 问题
- ⚙️ 可部署至 Netlify / Cloudflare Workers 等 Serverless 平台
- 🧩 结构清晰、依赖少，适合集成使用

---

## 🚀 使用方法

请使用 `encodeURIComponent()` 对目标链接进行编码，例如：

```bash
# 推荐路径式写法
https://your-site.netlify.app/proxy/https%3A%2F%2Fexample.com%2Fimage.jpg

# 可选查询参数写法（Netlify 默认支持）
https://your-site.netlify.app/proxy?url=https%3A%2F%2Fexample.com%2Fimage.jpg
```

Cloudflare Workers 可使用相同格式，换成自定义域名后可提高国内可访问性。

---

## 🌐 Cloudflare Workers 在中国大陆的限制

部署完成后默认生成的域名如下：

```
https://your-worker-id.workers.dev
```

⚠️ 该域名在中国大陆存在 DNS 污染或连接中断问题，可能导致资源无法加载或请求超时。

### ✅ 建议方案：

使用自己的自定义域名（如 `img.example.com`）绑定至 Cloudflare Worker，提高访问稳定性。

```bash
https://img.example.com/proxy/https%3A%2F%2Fexample.com%2Fimage.jpg
```

---

## 📁 项目结构

```bash
re-pro/
├── cf-worker/
│   └── workers.js              # Cloudflare Worker 脚本
├── netlify/
│   └── functions/
│       └── proxy.js            # Netlify Functions 函数
├── netlify.toml                # Netlify 路由重写配置
├── package.json                # 项目元信息（可选）
└── README.md                   # 使用说明
```

---

## 📄 License

[MIT](./LICENSE) © [wob25](https://github.com/wob25)

> 使用本项目即表示你已充分了解部署风险，并愿意自行承担由此产生的责任。
