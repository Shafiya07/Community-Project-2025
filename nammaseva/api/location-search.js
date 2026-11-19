module.exports = async function locationSearch(request, response) {
  response.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const query = String(request.query?.q || "").trim();
  if (query.length < 3 || query.length > 120) {
    return response.status(400).json({ error: "Enter at least 3 characters to search for a location." });
  }

  const params = new URLSearchParams({
    q: query,
    countrycode: "IN",
    lat: "13.3409",
    lon: "77.1010",
    limit: "6",
    lang: "en",
  });

  try {
    const upstream = await fetch(`https://photon.komoot.io/api/?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!upstream.ok) return response.status(502).json({ error: "Location search is temporarily unavailable." });
    const data = await upstream.json();
    return response.status(200).json({ features: Array.isArray(data.features) ? data.features.slice(0, 6) : [] });
  } catch (error) {
    console.error("Location search failed:", error.message);
    return response.status(502).json({ error: "Location search is temporarily unavailable." });
  }
};
