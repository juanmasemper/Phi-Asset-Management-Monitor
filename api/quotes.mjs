const endpoint = "https://data.alpaca.markets/v2/stocks/snapshots";

export async function GET(request) {
  const key = process.env.APCA_API_KEY_ID;
  const secret = process.env.APCA_API_SECRET_KEY;
  if (!key || !secret) return Response.json({ status: "unconfigured" }, { status: 503 });

  const input = new URL(request.url).searchParams.get("symbols") ?? "";
  const symbols = [...new Set(input.split(","))];
  if (symbols.length > 250 || symbols.some(symbol => !/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol))) {
    return Response.json({ status: "invalid_symbols" }, { status: 400 });
  }

  const feed = process.env.ALPACA_DATA_FEED === "sip" ? "sip" : "iex";
  const upstream = new URL(endpoint);
  upstream.search = new URLSearchParams({ symbols: symbols.join(","), feed });
  try {
    const response = await fetch(upstream, {
      headers: { "APCA-API-KEY-ID": key, "APCA-API-SECRET-KEY": secret },
      signal: AbortSignal.timeout(6500),
    });
    if (!response.ok) {
      console.warn("Market data request rejected", { feed, upstreamStatus: response.status });
      return Response.json({ status: "provider_unavailable" }, { status: 502 });
    }
    const snapshots = await response.json();
    const quotes = Object.fromEntries(symbols.flatMap(symbol => {
      const snapshot = snapshots[symbol];
      const trade = snapshot?.latestTrade;
      if (!(trade?.p > 0) || !Number.isFinite(Date.parse(trade.t))) return [];
      const bar = snapshot.dailyBar;
      return [[symbol, {
        price: trade.p,
        time: trade.t,
        previousClose: snapshot.prevDailyBar?.c,
        daily: bar && { open: bar.o, high: bar.h, low: bar.l, volume: bar.v, time: bar.t },
      }]];
    }));
    const quoteCount = Object.keys(quotes).length;
    const newest = Object.values(quotes).reduce((time, quote) => Math.max(time, Date.parse(quote.time)), 0);
    console.info("Market data received", { feed, quoteCount, latestTrade: newest ? new Date(newest).toISOString() : null });
    return Response.json({ feed, quotes }, { headers: { "Cache-Control": "private, max-age=20" } });
  } catch {
    return Response.json({ status: "provider_unavailable" }, { status: 502 });
  }
}
