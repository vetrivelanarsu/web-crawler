const http = require('http');
const { crawl } = require('./src/crawler');
const { fetch } = require('./src/fetcher');
const { parse } = require('./src/parser');
const { createQuerier } = require('./src/extractor');
const store = require('./src/store');

const app = require('./src/router'); 

function createApp() {
  const routes = [];
  const app = {
    get(path, handler) { routes.push({ method: 'GET', path, handler }); },
    post(path, handler) { routes.push({ method: 'POST', path, handler }); },
    handle(req, res) {
      const route = routes.find(r => r.method === req.method && matchPath(r.path, req.url));
      if (route) {
        res.json = (data) => {
          res.writeHead(res.statusCode || 200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data, null, 2));
        };
        res.status = (code) => { res.statusCode = code; return res; };
        route.handler(req, res);
      } else {
        res.writeHead(404); res.end('Not found');
      }
    }
  };
  return app;
}

function matchPath(pattern, url) {
  const pathname = url.split('?')[0];
  return pattern === pathname;
}

function parseQuery(url) {
  const qs = url.split('?')[1] || '';
  return Object.fromEntries(new URLSearchParams(qs));
}

const app2 = createApp();

// Single-page scrape
app2.get('/scrape', async (req, res) => {
  const { url, selector } = parseQuery(req.url);
  if (!url) return res.status(400).json({ error: 'url query param required' });
  try {
    const { html } = await fetch(url);
    const root = parse(html);
    const $ = createQuerier(root);
    const result = selector ? $(selector).texts() : {
      title: $('title').text(),
      h1: $('h1').texts(),
      links: $('a').attrs('href'),
      metaDescription: $('meta[name=description]').attr('content'),
    };
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start a crawl (non-blocking)
app2.post('/crawl', (req, res) => {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    const opts = JSON.parse(body || '{}');
    if (!opts.seedUrl) return res.status(400).json({ error: 'seedUrl required' });
    const id = Date.now().toString();
    store.setCrawlId(id);
    crawl(opts).catch(console.error); // fire-and-forget
    res.json({ crawlId: id, message: 'Crawl started' });
  });
});

// Crawl status + results
app2.get('/status', (req, res) => {
  res.json({
    status: store.getStatus(),
    pagesVisited: store.size(),
    crawlId: store.getCrawlId(),
  });
});

app2.get('/results', (req, res) => {
  res.json(store.getAll());
});

// Stop crawl
app2.post('/stop', (req, res) => {
  store.setStatus('stopped');
  res.json({ message: 'Crawl stopped' });
});

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  app2.handle(req, res);
});

server.listen(3000, () => console.log('Crawler running on http://localhost:3000'));