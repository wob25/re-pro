/**
 * 通用网页代理 Worker
 *
 * 功能:
 * 1.  安全代理: 仅允许白名单中的域名通过，防止滥用。
 * 2.  CDN 加速: 利用 Cloudflare 全球节点，为访问提供网络路径优化。
 * 3.  边缘缓存: 主动将成功获取的资源在边缘节点缓存7天，为后续访问提供毫秒级响应。
 * 4.  HTML 内容重写: 智能修复被代理页面的相对路径，保证图片、CSS 等资源正常加载。
 */

// -----------------------------------------------------
// 配置区: 在这里修改你的设置
// -----------------------------------------------------

// ✅ 定义你的网站白名单。只有这些域名及其子域名能被代理。
const ALLOWED_DOMAINS = [
  'notion.so',
  'file.notion.so',
  'images.unsplash.com',
  // ➡️ 在这里添加更多您想允许的域名，例如:
  // 'wikipedia.org',
  // 'github.com',
];

// -----------------------------------------------------
// 主逻辑区: 通常无需修改以下内容
// -----------------------------------------------------

/**
 * 主入口：监听并处理所有传入的 fetch 事件。
 */
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event))
})

/**
 * 核心请求处理函数
 * @param {FetchEvent} event - Cloudflare 传入的事件对象
 */
async function handleRequest(event) {
  const request = event.request;
  const url = new URL(request.url);

  // --- 缓存检查 (加速核心 Part 1) ---
  // 定义缓存 API 的快捷方式
  const cache = caches.default;
  // 尝试从缓存中匹配当前请求
  let response = await cache.match(request);

  // 如果在缓存中找到响应 (缓存命中)
  if (response) {
    console.log(`[Cache] HIT for: ${request.url}`);
    // 直接返回缓存的响应，实现极速加载
    return response;
  }
  // 如果未命中缓存，在日志中记录
  console.log(`[Cache] MISS for: ${request.url}`);


  // --- 代理逻辑 ---
  // 从路径中解析出要代理的目标 URL
  // 例如: /proxy/https://example.com -> https://example.com
  const rawTarget = url.pathname.substring('/proxy/'.length)
  const targetUrlString = rawTarget + url.search + url.hash

  // 如果 /proxy/ 后面没有内容，返回错误提示
  if (!rawTarget) {
    return new Response('❌ 请在 /proxy/ 后提供目标网址', { status: 400 })
  }

  // 验证目标 URL 是否合法
  let targetUrl;
  try {
    targetUrl = new URL(targetUrlString);
  } catch (e) {
    return new Response(`❌ 无效的目标网址：${targetUrlString}`, { status: 400 })
  }

  // --- 安全检查：白名单验证 ---
  // 检查目标域名是否在我们的白名单内
  const isAllowed = ALLOWED_DOMAINS.some(domain =>
    targetUrl.hostname === domain || targetUrl.hostname.endsWith('.' + domain)
  );

  // 如果域名不被允许，返回 403 Forbidden 错误
  if (!isAllowed) {
    return new Response(`⛔️ 禁止访问: 域名 ${targetUrl.hostname} 不在白名单内。`, { status: 403 });
  }


  // --- 请求转发与内容处理 ---
  // 创建一个发往目标服务器的新请求
  const modifiedRequest = new Request(targetUrl.toString(), {
    headers: request.headers,
    method: request.method,
    body: request.body,
    redirect: 'follow' // 自动跟随重定向
  })

  // 发起请求，获取原始响应
  let originalResponse = await fetch(modifiedRequest);
  const contentType = originalResponse.headers.get('Content-Type') || '';

  // --- HTML 内容重写 ---
  // 如果响应内容是 HTML，我们需要重写其中的链接
  if (contentType.includes('text/html')) {
    const text = await originalResponse.text();
    const base = targetUrl.origin;
    const proxyPrefix = url.origin + '/proxy/';

    // 使用正则表达式查找所有相对路径的 href 和 src 属性
    const rewritten = text.replace(/(href|src)=["']((?!https?:)[^"']+)["']/g, (match, attr, path) => {
        let fullUrl;
        try {
          // 根据不同类型的相对路径，拼接成完整的绝对 URL
          if (path.startsWith('//')) {
              fullUrl = targetUrl.protocol + path;
          } else if (path.startsWith('/')) {
              fullUrl = base + path;
          } else {
              fullUrl = new URL(path, targetUrl.toString()).toString();
          }
          // 在完整的 URL 前面加上我们的代理前缀
          return `${attr}="${proxyPrefix}${fullUrl}"`;
        } catch(e) {
          // 如果路径解析失败，保持原样以避免页面崩溃
          return match;
        }
    });

    // 基于重写后的内容，创建一个新的 Response 对象
    originalResponse = new Response(rewritten, originalResponse);
  }

  // 创建最终要返回给用户的响应
  const modifiedResponse = new Response(originalResponse.body, originalResponse);
  
  // 设置必要的 CORS 头部，允许跨域访问
  modifiedResponse.headers.set('Access-Control-Allow-Origin', '*')
  modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS')
  modifiedResponse.headers.set('Access-Control-Allow-Headers', request.headers.get('Access-Control-Request-Headers') || '*')


  // --- 缓存存储 (加速核心 Part 2) ---
  // 仅当请求方法为 GET 且响应成功时，才进行缓存
  if (request.method === 'GET' && modifiedResponse.ok) {
    // 设置缓存控制头部，有效期为 7 天 (604800 秒)
    modifiedResponse.headers.set('Cache-Control', 'public, max-age=604800');
    // 使用 event.waitUntil 确保缓存操作在后台完成，不会阻塞对用户的响应
    event.waitUntil(cache.put(request, modifiedResponse.clone()));
  }

  // 将最终的响应返回给用户
  return modifiedResponse;
}
