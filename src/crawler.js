const { fetch } = require('./fetcher');
const { parse } = require('./parser');
const { createQuerier } = require('./extractor');
const urlMgr = require('./urlManager');
const { throttle } = require('./rateLimiter');
const store = require('./store');

async function crawl({ seedUrl, maxDepth = 2, concurrency = 3, rateMs = 1000, sameDomainOnly = true }) {
  store.clear();
  urlMgr.clearVisited();
  store.setStatus('running');

  const disallowed = await urlMgr.fetchRobotsTxt(seedUrl);
  const queue = [{ url: seedUrl, depth: 0 }];

  // Concurrency pool — process N pages at a time
  async function processItem(item) {
    if (store.getStatus() === 'stopped') return;
    const { url, depth } = item;
    if (urlMgr.isVisited(url)) return;
    if (!urlMgr.isAllowed(url, disallowed)) return;

    urlMgr.markVisited(url);
    await throttle(url, rateMs);

    try {
      const { html, finalUrl } = await fetch(url);
      const root = parse(html);
      const $ = createQuerier(root);

      // Extract data
      const data = {
        title: $('title').text() || $('h1').text(),
        headings: $('h1').texts().concat($('h2').texts()),
        links: $('a').attrs('href')
          .map(href => urlMgr.normalizeUrl(href, finalUrl))
          .filter(Boolean),
        metaDescription: $('meta[name=description]').attr('content') || '',
        depth,
      };

      store.save(finalUrl, data);

      // Enqueue discovered links
      if (depth < maxDepth) {
        for (const link of data.links) {
          if (!urlMgr.isVisited(link) && (!sameDomainOnly || urlMgr.isSameDomain(link, seedUrl))) {
            queue.push({ url: link, depth: depth + 1 });
          }
        }
      }
    } catch (err) {
      store.save(url, { error: err.message, depth });
    }
  }

  // Run with concurrency limit
  while (queue.length > 0 && store.getStatus() === 'running') {
    const batch = queue.splice(0, concurrency);
    await Promise.all(batch.map(processItem));
  }

  store.setStatus('done');
}

module.exports = { crawl };