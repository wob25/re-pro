const fetch = require('node-fetch');

exports.handler = async function (event) {
  try {
    let targetUrlString = event.path.substring('/proxy/'.length);
    if (event.rawQuery) {
      targetUrlString += `?${event.rawQuery}`;
    }
    if (!targetUrlString) {
      return { statusCode: 400, body: '❌ 请求中缺少目标 URL' };
    }

    targetUrlString = decodeURIComponent(targetUrlString);
    if (targetUrlString.startsWith('https:/') && !targetUrlString.startsWith('https://')) {
      targetUrlString = 'https://' + targetUrlString.substring('https:/'.length);
    } else if (!targetUrlString.startsWith('http')) {
      targetUrlString = 'https://' + targetUrlString;
    }

    const targetUrl = new URL(targetUrlString);

    const response = await fetch(targetUrl.toString(), {
      method: event.httpMethod,
      headers: { ...event.headers, host: targetUrl.host }
    });

    const contentType = response.headers.get('Content-Type') || '';
    const originalBody = await response.buffer();
    let bodyToReturn = originalBody;
    let encoding = 'base64'; // 默认返回 Base64

    // 👉 如果是 HTML，就尝试重写资源路径
    if (contentType.includes('text/html')) {
      const text = originalBody.toString('utf-8');
      const base = targetUrl.origin;
      const proxy = '/proxy/';

      const rewritten = text
        .replace(/(href|src)=["'](\/[^"'>]+)["']/g, (_, attr, path) => {
          const full = `${proxy}${base}${path}`;
          return `${attr}="${full}"`;
        });

      bodyToReturn = Buffer.from(rewritten, 'utf-8');
      encoding = 'utf-8'; // 返回纯文本
    }

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      },
      body: encoding === 'utf-8' ? bodyToReturn.toString('utf-8') : bodyToReturn.toString('base64'),
      isBase64Encoded: encoding === 'base64'
    };

  } catch (err) {
    console.error("代理函数出错:", err);
    return {
      statusCode: 500,
      body: `⚠️ 代理服务出错: ${err.message}`,
    };
  }
};
