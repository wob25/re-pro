// 引入 node-fetch，它在 Netlify 的 Node.js 环境中表现更稳定
const fetch = require('node-fetch');

// 白名单域名（可以在这里修改添加想要反代的域名）
const ALLOWED_DOMAINS = [
  'notion.so',
  'www.notion.so',
  'file.notion.so',
  'images.unsplash.com',
];

// Netlify 函数的标准写法
exports.handler = async function (event, context) {
  try {
    // 1. 从请求路径中解析出目标 URL
    let targetUrlString = event.path.substring('/proxy/'.length);
    if (event.rawQuery) {
        targetUrlString += `?${event.rawQuery}`;
    }

    if (!targetUrlString) {
      return { statusCode: 400, body: '❌ 请求中缺少目标 URL' };
    }

    // 2. 解码并修正 URL
    targetUrlString = decodeURIComponent(targetUrlString);
    if (targetUrlString.startsWith('https:/') && !targetUrlString.startsWith('https://')) {
        targetUrlString = 'https://' + targetUrlString.substring('https:/'.length);
    } else if (!targetUrlString.startsWith('http')) {
        targetUrlString = 'https://' + targetUrlString;
    }

    const targetUrl = new URL(targetUrlString);

    // 3. 校验域名
    if (!ALLOWED_DOMAINS.some(domain => targetUrl.hostname.endsWith(domain))) {
      return { statusCode: 403, body: `⛔️ 不允许代理该域名：${targetUrl.hostname}` };
    }
    
    // 4. --- 这是最关键的修改 ---
    // 创建一个新的 Headers 对象，只转发必要的头信息
    const headers = {};
    const requiredHeaders = ['user-agent', 'accept', 'accept-language', 'accept-encoding'];
    requiredHeaders.forEach(h => {
        if(event.headers[h]) headers[h] = event.headers[h];
    });


    // 5. 发起代理请求
    const response = await fetch(targetUrl.toString(), {
      method: event.httpMethod,
      headers: headers, // 使用清理过的请求头
    });

    // 如果对 Notion 的请求失败，则提前返回错误
    if (!response.ok) {
        return {
            statusCode: response.status,
            body: `上游服务器错误: ${response.statusText}`
        };
    }

    // 6. 处理响应 - 修正了头信息处理
    const buffer = await response.arrayBuffer();
    
    return {
      statusCode: 200,
      headers: {
        // 关键：从成功的响应中获取 Content-Type，并设置一个备用值
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
      },
      body: Buffer.from(buffer).toString('base64'),
      isBase64Encoded: true,
    };

  } catch (err) {
    console.error("代理函数出错:", err);
    return {
      statusCode: 500,
      body: `⚠️ 代理服务出错: ${err.message}`,
    };
  }
};
