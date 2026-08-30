const base = require('./app.json');

const rawOrigin = process.env.EXPO_PUBLIC_API_ORIGIN || process.env.EXPO_PUBLIC_DOMAIN;
if (process.env.EAS_BUILD_PROFILE && !rawOrigin) {
  throw new Error('EXPO_PUBLIC_API_ORIGIN is required for native EAS builds.');
}
if (rawOrigin) {
  const normalized = /^https?:\/\//i.test(rawOrigin) ? rawOrigin : `https://${rawOrigin}`;
  const parsed = new URL(normalized);
  if (parsed.protocol !== 'https:' || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('EXPO_PUBLIC_API_ORIGIN must be an HTTPS origin without a path.');
  }
}

module.exports = base;