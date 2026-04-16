const https = require('https');
const http = require('http');
const zlib = require('zlib');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const { timeout = 10000, maxRedirects = 5 } = options;
    let redirectCount = 0;

    function doRequest(currentUrl) {
      const parsed = new URL(currentUrl);
      const lib = parsed.protocol === 'https:' ? https : http;

      const req = lib.get(currentUrl, {
        headers: {
          'User-Agent': 'WebCrawler/1.0 (educational project)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Encoding': 'gzip, deflate',
        }
      }, (res) => {
        // Follow redirects
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          if (++redirectCount > maxRedirects) return reject(new Error('Too many redirects'));
          const location = res.headers['location'];
          const nextUrl = new URL(location, currentUrl).href;
          res.resume(); // drain
          return doRequest(nextUrl);
        }

        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${currentUrl}`));
        }

        const encoding = res.headers['content-encoding'];
        let stream = res;

        if (encoding === 'gzip') stream = res.pipe(zlib.createGunzip());
        else if (encoding === 'deflate') stream = res.pipe(zlib.createInflate());

        let data = '';
        stream.setEncoding('utf8');
        stream.on('data', chunk => data += chunk);
        stream.on('end', () => resolve({ html: data, finalUrl: currentUrl, statusCode: res.statusCode }));
        stream.on('error', reject);
      });

      req.setTimeout(timeout, () => { req.destroy(); reject(new Error(`Timeout: ${currentUrl}`)); });
      req.on('error', reject);
    }

    doRequest(url);
  });
}

module.exports = { fetch };