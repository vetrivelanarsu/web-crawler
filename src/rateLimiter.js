// Token bucket per domain
const buckets = new Map();

function getBucket(domain, rateMs = 1000) {
  if (!buckets.has(domain)) {
    buckets.set(domain, { tokens: 1, lastRefill: Date.now(), rateMs });
  }
  return buckets.get(domain);
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function throttle(url, rateMs = 1000) {
  const { hostname } = new URL(url);
  const bucket = getBucket(hostname, rateMs);
  const now = Date.now();
  const elapsed = now - bucket.lastRefill;

  if (elapsed >= bucket.rateMs) {
    bucket.tokens = 1;
    bucket.lastRefill = now;
  }

  if (bucket.tokens > 0) {
    bucket.tokens--;
    return;
  }

  const delay = bucket.rateMs - elapsed;
  await wait(delay);
  bucket.tokens = 0;
  bucket.lastRefill = Date.now();
}

module.exports = { throttle };