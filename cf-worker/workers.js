addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // 1. 从请求 URL 中解析出真正的目标地址
  const url = new URL(request.url)
  // 拼接路径、查询参数和哈希值，构成完整的原始 URL
  const targetUrlString = url.pathname.substring('/proxy/'.length) + url.search + url.hash

  if (!targetUrlString) {
    return new Response('❌ 请在 /proxy/ 后提供目标网址', { status: 400 })
  }

  // 2. 尝试将字符串解析为 URL 对象，以验证其有效性
  let targetUrl
  try {
    // Cloudflare 会自动处理解码，这里直接用
    targetUrl = new URL(targetUrlString)
  } catch (e) {
    // 如果用户输入的不是一个合法的 URL，则返回错误
    return new Response(`❌ 无效的目标网址：${targetUrlString}`, { status: 400 })
  }

  // 3. 创建一个新的请求，发往真正的目标地址
  // 关键：直接复制原始请求的 headers, method, body 等所有信息
  // 这是最能保证兼容性的做法
  const modifiedRequest = new Request(targetUrl, {
    headers: request.headers,
    method: request.method,
    body: request.body,
    redirect: 'follow', // 自动跟随跳转
  })

  // 4. 发起请求，并等待响应
  const response = await fetch(modifiedRequest)

  // 5. 创建一个新的响应副本，以便我们可以修改它的头信息
  const modifiedResponse = new Response(response.body, response)

  // 6. 增加一个允许跨域访问的头，让这个代理可以在任何网站上被调用
  modifiedResponse.headers.set('Access-Control-Allow-Origin', '*')
  modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS')
  modifiedResponse.headers.set('Access-Control-Allow-Headers', request.headers.get('Access-Control-Request-Headers') || '*');


  // 7. 将最终的响应返回给浏览器
  return modifiedResponse
}
