addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

// ✅ 在这里定义你的网站白名单
// 只需要填写主域名，子域名会自动匹配
const ALLOWED_DOMAINS = [
  'notion.so',
  'file.notion.so',
  'images.unsplash.com',
  // ➡️ 在这里添加更多您想允许的域名，每个域名用逗号隔开
  // 'wikipedia.org',
  // 'api.github.com',
];

async function handleRequest(request) {
  const url = new URL(request.url)
  const target = url.pathname.replace('/proxy/', '') + url.search + url.hash

  try {
    const actualUrl = new URL(target)

    // ✅ 重新加入域名检查逻辑
    // some() 方法会检查数组中是否至少有一个元素满足条件
    const isAllowed = ALLOWED_DOMAINS.some(domain => 
      actualUrl.hostname.endsWith(domain)
    );

    // 如果请求的域名不在白名单内，则返回 403 Forbidden 错误
    if (!isAllowed) {
      return new Response(`⛔️ Forbidden domain: ${actualUrl.hostname}`, { status: 403 });
    }

    // 如果域名在白名单内，则继续执行代理请求
    const modifiedRequest = new Request(actualUrl.toString(), {
      headers: request.headers,
      method: request.method,
      body: request.body,
      redirect: 'follow',
    })

    const response = await fetch(modifiedRequest)
    const modifiedResponse = new Response(response.body, response)
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*')
    return modifiedResponse
    
  } catch (err) {
    return new Response(`❌ Invalid URL: ${err.message}`, { status: 400 })
  }
}
