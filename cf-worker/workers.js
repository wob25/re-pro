addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

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
    const base = targetUrl.origin
    const proxyPrefix = '/proxy/'

    const rewritten = text.replace(/(href|src)=["'](\/[^"'>]+)["']/g, (match, attr, path) => {
      const fullUrl = base + path
      return `${attr}="${proxyPrefix}${fullUrl}"`
    })

    body = rewritten
  }

  const modifiedResponse = new Response(body, response)
  modifiedResponse.headers.set('Access-Control-Allow-Origin', '*')
  modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS')
  modifiedResponse.headers.set('Access-Control-Allow-Headers', request.headers.get('Access-Control-Request-Headers') || '*')

  return modifiedResponse
}
