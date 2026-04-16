const https = require('https');
const http = require('http');

const visited = new Set();
const robotsCache = new Map();

function normalizeUrl(url, base) {
  try {
    const u = new URL(url, base);
    u.hash = ''; // strip fragment
    // Normalize trailing slash on root
    if (u.pathname === '') u.pathname = '/';
    return u.href;
  } catch { return null; }
}

function isSameDomain(url, base) {
  try {
    return new URL(url).hostname === new URL(base).hostname;
  } catch { return false; }
}

function isVisited(url) { return visited.has(url); }
function markVisited(url) { visited.add(url); }
function clearVisited() { visited.clear(); }
function getVisited() { return Array.from(visited); }

async function fetchRobotsTxt(baseUrl) {
  const { hostname, protocol } = new URL(baseUrl);
  const cacheKey = hostname;
  if (robotsCache.has(cacheKey)) return robotsCache.get(cacheKey);

  return new Promise((resolve) => {
    const lib = protocol === 'https:' ? https : http;
    lib.get(`${protocol}//${hostname}/robots.txt`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const disallowed = parseRobots(data);
        robotsCache.set(cacheKey, disallowed);
        resolve(disallowed);
      });
    }).on('error', () => {
      robotsCache.set(cacheKey, []);
      resolve([]);
    });
  });
}

function parseRobots(txt) {
  const disallowed = [];
  let inOurSection = false;
  for (const line of txt.split('\n')) {
    const l = line.trim();
    if (l.toLowerCase().startsWith('user-agent:')) {
      const agent = l.split(':')[1].trim();
      inOurSection = agent === '*' || agent.toLowerCase().includes('webcrawler');
    }
    if (inOurSection && l.toLowerCase().startsWith('disallow:')) {
      const path = l.split(':')[1].trim();
      if (path) disallowed.push(path);
    }
  }
  return disallowed;
}

function isAllowed(url, disallowedPaths) {
  try {
    const path = new URL(url).pathname;
    return !disallowedPaths.some(d => path.startsWith(d));
  } catch { return false; }
}

module.exports = { normalizeUrl, isSameDomain, isVisited, markVisited, clearVisited, getVisited, fetchRobotsTxt, isAllowed };