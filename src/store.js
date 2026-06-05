const results = new Map();
let crawlStatus = 'idle'; // idle | running | stopped | done
let activeCrawlId = null;

function setStatus(s) { crawlStatus = s; }
function getStatus() { return crawlStatus; }
function setCrawlId(id) { activeCrawlId = id; }
function getCrawlId() { return activeCrawlId; }

function save(url, data) { results.set(url, { ...data, scrapedAt: new Date().toISOString() }); }
function get(url) { return results.get(url); }
function getAll() { return Object.fromEntries(results); }
function clear() { results.clear(); }
function size() { return results.size; }

module.exports = { save, get, getAll, clear, size, setStatus, getStatus, setCrawlId, getCrawlId };