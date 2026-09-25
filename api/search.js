export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { query, key } = req.query;

  if (!query || !key) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios (query o key)' });
  }

  try {
    const shodanUrl = new URL('https://api.shodan.io/shodan/host/search');
    shodanUrl.searchParams.append('key', key);
    shodanUrl.searchParams.append('query', query);

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
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({
      error: 'Error interno en el proxy de Vercel',
      details: error.message
    });
  }
}
