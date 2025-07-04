addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const pathname = url.pathname

  if (pathname === '/') {
    const proxyPageUrl = new URL('/proxy/', url.origin)
    return Response.redirect(proxyPageUrl.toString(), 302)
  }

  if (pathname.startsWith('/proxy/')) {
    const targetUrlString = pathname.substring('/proxy/'.length) + url.search + url.hash
    if (!targetUrlString || targetUrlString === '/') {
      return new Response(getProxyLandingPage(), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }
    try {
      new URL(targetUrlString)
    } catch (e) {
      return new Response(`❌ 无效的目标网址：${targetUrlString}`, { status: 400 })
    }
    return proxyRequest(request, targetUrlString)
  }

  const proxyPageUrl = new URL('/proxy/', url.origin)
  return Response.redirect(proxyPageUrl.toString(), 302)
}

async function proxyRequest(request, targetUrlString) {
  try {
    const targetUrl = new URL(targetUrlString)
    const modifiedRequest = new Request(targetUrl.toString(), {
      headers: request.headers,
      method: request.method,
      body: request.body,
      redirect: 'follow'
    })
    const response = await fetch(modifiedRequest)
    const contentType = response.headers.get('Content-Type') || ''
    let body = response.body
    if (contentType.includes('text/html')) {
      const text = await response.text()
      const base = targetUrl.origin
      const proxyPrefix = new URL(request.url).origin + '/proxy/'
      const rewritten = text.replace(/(href|src)=["']((?!https?:)[^"']+)["']/g, (match, attr, path) => {
          let fullUrl;
          if (path.startsWith('//')) {
              fullUrl = targetUrl.protocol + path;
          } else if (path.startsWith('/')) {
              fullUrl = base + path;
          } else {
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
  } catch (e) {
      return new Response(`❌ 代理请求失败: ${e.message}`, { status: 502 })
  }
}

// 生成美化后的代理引导页 HTML
function getProxyLandingPage() {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>通用网页代理</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-color: #0072ff;
            --secondary-color: #00e472;
            --light-bg: #f0f4f8;
            --light-card-bg: #ffffff;
            --light-text: #2c3e50;
            --light-subtle-text: #7f8c8d;
            --light-card-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
            --light-card-border: #e8e8e8;
            --dark-bg: #1a1a2e;
            --dark-card-bg: #16213e;
            --dark-text: #e0e0e0;
            --dark-subtle-text: #a7a9be;
            --dark-card-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            --dark-card-border: #0f3460;
        }
        /* [新增] 标题动态渐变动画 */
        @keyframes animate-gradient-text {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        body {
            --bg: var(--light-bg);
            --card-bg: var(--light-card-bg);
            --text: var(--light-text);
            --subtle-text: var(--light-subtle-text);
            --card-shadow: var(--light-card-shadow);
            --card-border: var(--light-card-border);
            font-family: 'Noto Sans SC', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background-color: var(--bg);
            color: var(--text);
            padding: 20px;
            box-sizing: border-box;
            transition: background-color 0.3s ease, color 0.3s ease;
        }
        body.dark-mode {
            --bg: var(--dark-bg);
            --card-bg: var(--dark-card-bg);
            --text: var(--dark-text);
            --subtle-text: var(--dark-subtle-text);
            --card-shadow: var(--dark-card-shadow);
            --card-border: var(--dark-card-border);
        }
        #theme-toggle {
            position: absolute; top: 25px; right: 25px;
            background: none; border: none; cursor: pointer; padding: 8px;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            color: var(--subtle-text); transition: color 0.3s, background-color 0.3s;
        }
        #theme-toggle:hover { background-color: rgba(127, 140, 140, 0.1); }
        #theme-toggle svg { width: 24px; height: 24px; }
        .card {
            background-color: var(--card-bg); padding: 30px 40px;
            border-radius: 16px; box-shadow: var(--card-shadow);
            text-align: center; border: 1px solid var(--card-border);
            transition: all 0.3s ease; width: 100%; max-width: 700px;
        }
        h2 { 
            margin: 0 0 15px 0; font-weight: 700; font-size: 1.8rem;
            
            /* [应用] 为h2标题应用动画 */
            background: linear-gradient(90deg, var(--primary-color), var(--secondary-color), var(--primary-color));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-size: 200% auto;
            animation: animate-gradient-text 4s linear infinite;
        }
        p { color: var(--subtle-text); margin: 0 0 25px 0; line-height: 1.7; }
        .input-group {
            display: flex; border-radius: 8px; overflow: hidden; margin-top: 10px;
            border: 1px solid transparent; transition: border-color 0.3s;
        }
        .input-group:focus-within { border-color: var(--primary-color); }
        #url-input {
            flex-grow: 1; border: 1px solid var(--card-border); border-right: none;
            padding: 15px; font-size: 16px; outline: none;
            background-color: var(--bg); color: var(--text);
            border-radius: 8px 0 0 8px; transition: background-color 0.3s;
        }
        #proxy-button {
            border: none; background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
            color: white; padding: 0 25px; font-size: 16px; font-weight: 700;
            cursor: pointer; border-radius: 0 8px 8px 0; transition: filter 0.3s ease;
        }
        #proxy-button:hover { filter: brightness(1.2); }
    </style>
</head>
<body>
    <button id="theme-toggle" aria-label="切换主题"></button>
    <div class="card">
        <h2>🛠️ 通用网页代理</h2>
        <p>在此处输入您想访问的完整 URL，即可通过此 Worker 代理访问。</p>
        <div class="input-group">
            <input type="text" id="url-input" placeholder="https://example.com" onkeydown="handleEnter(event)">
            <button id="proxy-button" onclick="proxyUrl()">代理访问</button>
        </div>
    </div>
    <script>
        const themeToggle = document.getElementById('theme-toggle');
        const body = document.body;
        const sunIcon = \`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>\`;
        const moonIcon = \`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>\`;
        function setTheme(theme) {
            if (theme === 'dark') {
                body.classList.add('dark-mode');
                themeToggle.innerHTML = sunIcon;
                localStorage.setItem('theme', 'dark');
            } else {
                body.classList.remove('dark-mode');
                themeToggle.innerHTML = moonIcon;
                localStorage.setItem('theme', 'light');
            }
        }
        themeToggle.addEventListener('click', () => {
            const currentTheme = localStorage.getItem('theme') === 'dark' ? 'light' : 'dark';
            setTheme(currentTheme);
        });
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
        const urlInput = document.getElementById('url-input');
        function proxyUrl() {
            let targetUrl = urlInput.value.trim();
            if (!targetUrl) { return; }
            if (!targetUrl.startsWith('http')) { targetUrl = 'https://' + targetUrl; }
            window.location.href = \`/proxy/\${targetUrl}\`;
        }
        function handleEnter(event) { if (event.key === 'Enter') { proxyUrl(); } }
    </script>
</body>
</html>
`;
}
