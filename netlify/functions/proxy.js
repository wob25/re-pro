const fetch = require('node-fetch');

// Netlify 函数的标准写法
exports.handler = async function (event, context) {
  try {
    // 1. 从请求路径中解析出目标 URL
    let targetUrlString = event.path.substring('/proxy/'.length);
    // 拼接上原始的查询参数
    if (event.rawQuery) {
        targetUrlString += `?${event.rawQuery}`;
    }

    if (!targetUrlString) {
      return { statusCode: 400, body: '❌ 请求中缺少目标 URL' };
    }

    // 2. 解码并修正 URL，以防万一
    targetUrlString = decodeURIComponent(targetUrlString);
    if (targetUrlString.startsWith('https:/') && !targetUrlString.startsWith('https://')) {
        targetUrlString = 'https://' + targetUrlString.substring('https:/'.length);
    } else if (!targetUrlString.startsWith('http')) {
        targetUrlString = 'https://' + targetUrlString;
    }

    const targetUrl = new URL(targetUrlString);

    // 3. 发起代理请求
    const response = await fetch(targetUrl.toString(), {
      method: event.httpMethod,
      headers: { ...event.headers, host: targetUrl.host }, // 转发头信息，并修正 host
    });

    // 如果对目标服务器的请求失败，则提前返回错误
    if (!response.ok) {
        return {
            statusCode: response.status,
            body: `上游服务器错误: ${response.statusText}`
        };
    }

    // 4. 将图片等二进制文件转换为 Base64 编码返回
    const buffer = await response.arrayBuffer();
    
    return {
      statusCode: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*', // 允许跨域
      },
      body: Buffer.from(buffer).toString('base64'),
      isBase64Encoded: true, // 告诉 Netlify, body 是 Base64 编码
    };

  } catch (err) {
    console.error("代理函数出错:", err);
    return {
      statusCode: 500,
      body: `⚠️ 代理服务出错: ${err.message}`,
    };
  }
};
