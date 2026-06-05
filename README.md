# web-crawler

A zero-dependency web crawler and scraper built in Node.js from scratch.
No external packages — custom HTML parser, CSS selector engine, rate limiter, and BFS crawler engine.

## Modules
- `fetcher.js` — HTTP/HTTPS with redirect following, gzip, timeout
- `parser.js` — State machine HTML parser, builds a real DOM tree
- `extractor.js` — jQuery-like query API ($, .text(), .attr(), .find())
- `urlManager.js` — URL normalization, dedup, robots.txt
- `rateLimiter.js` — Token bucket per domain
- `crawler.js` — BFS engine with concurrency pool
- `store.js` — In-memory result store

## Usage
node --watch server.js

GET  /scrape?url=https://example.com
POST /crawl  { "seedUrl": "https://example.com", "maxDepth": 2 }
GET  /status
GET  /results
POST /stop