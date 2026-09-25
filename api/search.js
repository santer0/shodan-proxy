export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { query, key } = req.query;

  if (!query || !key) {
    return res.status(400).json({
      error: 'Faltan parámetros obligatorios (query o key)'
    });
  }

  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 20)
    : 10;

  try {
    const shodanUrl = new URL('https://api.shodan.io/shodan/host/search');
    shodanUrl.searchParams.append('key', key);
    shodanUrl.searchParams.append('query', query);
    shodanUrl.searchParams.append('page', '1');

    const response = await fetch(shodanUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      const htmlText = await response.text();
      return res.status(502).json({
        error: 'Shodan devolvió HTML en vez de JSON',
        status_code: response.status,
        snippet: htmlText.substring(0, 150)
      });
    }

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error || 'Shodan devolvió un error'
      });
    }

    const matches = Array.isArray(data.matches) ? data.matches : [];

    const compactMatches = matches.slice(0, limit).map((host) => ({
      ip: host.ip_str || null,
      port: host.port || null,
      transport: host.transport || null,
      hostnames: Array.isArray(host.hostnames) ? host.hostnames.slice(0, 10) : [],
      domains: Array.isArray(host.domains) ? host.domains.slice(0, 10) : [],
      org: host.org || null,
      isp: host.isp || null,
      country: host.location?.country_name || host.country_name || null,
      country_code: host.location?.country_code || host.country_code || null,
      city: host.location?.city || null,
      product: host.product || null,
      version: host.version || null,
      os: host.os || null,
      tags: Array.isArray(host.tags) ? host.tags.slice(0, 10) : [],
      vulns: Array.isArray(host.vulns)
        ? host.vulns.slice(0, 20)
        : (host.vulns && typeof host.vulns === 'object'
            ? Object.keys(host.vulns).slice(0, 20)
            : [])
    }));

    return res.status(200).json({
      total: data.total || 0,
      returned: compactMatches.length,
      limit,
      query,
      matches: compactMatches
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error interno en el proxy de Vercel',
      details: error.message
    });
  }
}
