// Best-effort image lookup for a round's word via Wikipedia's public REST
// summary API (no key required). Failures/timeouts just mean no picture —
// the round always proceeds on the word text alone.
const LOOKUP_TIMEOUT_MS = 5000;
const cache = new Map(); // wiki title -> image URL or null

async function lookupImage(title) {
  if (cache.has(title)) return cache.get(title);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      {
        signal: controller.signal,
        headers: { "User-Agent": "ImposterParty/1.0 (private party game; no contact)" },
      }
    );
    if (!res.ok) throw new Error(`lookup failed: ${res.status}`);
    const data = await res.json();
    const url = data?.thumbnail?.source || data?.originalimage?.source || null;
    cache.set(title, url);
    return url;
  } catch {
    cache.set(title, null);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { lookupImage };
