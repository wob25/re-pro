addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

// ✅ 在这里定义你的网站白名单
const ALLOWED_DOMAINS = [
  'notion.so',
  'file.notion.so',
  'images.unsplash.com',
  // ➡️ 在这里添加更多您想允许的域名
];

async function handleRequest(request) {
  const url = new URL(request.url)
  const rawTarget = url.pathname.substring('/proxy/'.length)
  const targetUrlString = rawTarget + url.search + url.hash

  if (!rawTarget) {
    return new Response('❌ 请在 /proxy/ 后提供目标网址', { status: 400 })
  }

  let targetUrl
  try {
    targetUrl = new URL(targetUrlString)
  } catch (e) {
    return new Response(`❌ 无效的目标网址：${targetUrlString}`, { status: 400 })
  }

  // ✅ 重新加入域名检查逻辑
  const isAllowed = ALLOWED_DOMAINS.some(domain => 
    targetUrl.hostname === domain || targetUrl.hostname.endsWith('.' + domain)
  );

  // 如果请求的域名不在白名单内，则返回 403 Forbidden 错误
  if (!isAllowed) {
    return new Response(`⛔️ Forbidden domain: ${targetUrl.hostname}`, { status: 403 });
  }

  // --- 后续逻辑与脚本 #2 相同 ---

  const modifiedRequest = new Request(targetUrl.toString(), {
    headers: request.headers,
    method: request.method,
    body: request.body,
    redirect: 'follow'
  })

  const response = await fetch(modifiedRequest)
  const contentType = response.headers.get('Content-Type') || ''
  let body = response.body

  // 自动重写 HTML 中的资源路径
  if (contentType.includes('text/html')) {
    const text = await response.text()
    // 使用目标 URL 的 origin 作为基础路径
    const base = targetUrl.origin
    // 代理前缀
    const proxyPrefix = url.origin + '/proxy/' // 使用 worker 的 origin

    // 正则表达式重写 href 和 src
    // 匹配相对路径 (/, //, ./, ../) 和没有协议的绝对路径
    const rewritten = text.replace(/(href|src)=["']((?!https?:)[^"']+)["']/g, (match, attr, path) => {
        let fullUrl;
        if (path.startsWith('//')) {
            fullUrl = targetUrl.protocol + path;
        } else if (path.startsWith('/')) {
            fullUrl = base + path;
        } else {
            // 处理 ./ 和 ../ 等相对路径
            fullUrl = new URL(path, targetUrl.toString()).toString();
        }
        return `${attr}="${proxyPrefix}${fullUrl}"`;
    });

    body = rewritten
  }

  const modifiedResponse = new Response(body, response)
  modifiedResponse.headers.set('Access-Control-Allow-Origin', '*')
  modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS')
  modifiedResponse.headers.set('Access-Control-Allow-Headers', request.headers.get('Access-Control-Request-Headers') || '*')

  return modifiedResponse
}
