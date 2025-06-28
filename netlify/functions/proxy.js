// 引入 node-fetch
const fetch = require('node-fetch');

// ✅ 在这里定义你的网站白名单
// 只需要填写主域名，子域名会自动匹配
const ALLOWED_DOMAINS = [
  'notion.so',
  'file.notion.so',
  'images.unsplash.com',
  // ➡️ 在这里添加更多您想允许的域名
  // 'wikipedia.org',
];

// Netlify 函数的标准写法
exports.handler = async function (event, context) {
  try {
    // 1. 从请求路径中解析出目标 URL
    // event.path 是 Netlify 提供的请求路径, e.g., /proxy/https://www.notion.so/page
    let targetUrlString = event.path.substring('/proxy/'.length);

    // 附加上请求的查询参数 (e.g., ?a=1&b=2)
    if (event.rawQuery) {
      targetUrlString += `?${event.rawQuery}`;
    }

    if (!targetUrlString) {
      return { statusCode: 400, body: '❌ 请求中缺少目标 URL' };
    }

    // 2. 解码并尝试修正 URL
    // 有时 URL 会被编码，需要解码回来
    targetUrlString = decodeURIComponent(targetUrlString);

    // 简单修正一下，确保是以 http 或 https 开头
    if (!targetUrlString.startsWith('http')) {
      targetUrlString = 'https://' + targetUrlString;
    }

    const targetUrl = new URL(targetUrlString);

    // 3. ⭐️【优化】更严格的域名校验
    // 检查域名是否完全匹配或以 ".域名" 结尾，防止 `fakenotion.so` 这样的域名绕过
    const isAllowed = ALLOWED_DOMAINS.some(domain => 
      targetUrl.hostname === domain || targetUrl.hostname.endsWith('.' + domain)
    );

    if (!isAllowed) {
      return { statusCode: 403, body: `⛔️ 不允许代理该域名: ${targetUrl.hostname}` };
    }

    // 4. 转发请求头和请求体 (Body)
    // ⭐️【优化】不仅转发了头信息，还正确处理了 POST 等请求的 body
    const requestOptions = {
      method: event.httpMethod,
      headers: event.headers,
      redirect: 'follow', // 自动跟随重定向
    };
    
    // 如果是 POST, PUT 等有请求体的请求，则附加上请求体
    if (event.body) {
      requestOptions.body = event.body;
      // 如果 body 是 base64 编码的，先解码
      if (event.isBase64Encoded) {
        requestOptions.body = Buffer.from(event.body, 'base64');
      }
    }

    // 5. 发起代理请求
    const response = await fetch(targetUrl.toString(), requestOptions);

    // 6. ⭐️⭐️⭐️【核心优化】处理响应，智能重写 HTML 链接
    const contentType = response.headers.get('Content-Type') || '';
    let responseBody;
    let isBase64 = true; // 默认是 Base64，因为 Netlify 对二进制文件友好

    if (contentType.includes('text/html')) {
      // 如果是 HTML 文件，我们需要读取内容并重写链接
      const originalHtml = await response.text();
      isBase64 = false; // HTML 是文本，不需要 Base64

      // 定义代理前缀，所有相对链接都要加上这个前缀
      const proxyPrefix = '/proxy/';

      // 使用正则表达式查找所有的 href="/..." 和 src="/..."，并替换它们
      responseBody = originalHtml.replace(/(href|src)=["']((?!https?:)[^"']+)["']/g, (match, attr, path) => {
        let fullUrl;
        try {
          // 将相对路径 (如 /a/b, ../c) 转换为完整的 URL
          fullUrl = new URL(path, targetUrl.toString()).toString();
        } catch (e) {
          // 如果路径无效，则保持原样
          return match;
        }
        // 返回重写后的链接
        return `${attr}="${proxyPrefix}${fullUrl}"`;
      });

    } else {
      // 如果不是 HTML (比如图片、CSS、JS 文件)，直接返回二进制内容
      const buffer = await response.arrayBuffer();
      responseBody = Buffer.from(buffer).toString('base64');
    }
    
    // 7. 构建并返回最终响应给浏览器
    // ⭐️【优化】复制大部分原始响应头，保证如文件下载等功能正常
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // 强制添加跨域头，确保浏览器能正常加载
    responseHeaders['Access-Control-Allow-Origin'] = '*';
    responseHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    responseHeaders['Access-Control-Allow-Headers'] = '*';
    
    // 删除一些可能引起问题的头
    delete responseHeaders['content-encoding'];
    delete responseHeaders['content-length'];

    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: responseBody,
      isBase64Encoded: isBase64,
    };

  } catch (err) {
    console.error("代理函数出错:", err);
    return {
      statusCode: 500,
      body: `⚠️ 代理服务出错: ${err.message}`,
    };
  }
};
