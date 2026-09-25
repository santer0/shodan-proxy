export default async function handler(req, res) {
  // Configuración de cabeceras CORS
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
    // Constructor nativo: Elimina cualquier error humano de sintaxis o comillas
    const shodanUrl = new URL("https://api.shodan.io/shodan/host/search");
    shodanUrl.searchParams.append("key", key);
    shodanUrl.searchParams.append("query", query);

    // Petición real a la API oficial de Shodan
    console.log("SHODAN_TARGET", shodanUrl.origin + shodanUrl.pathname);\n    const response = await fetch(shodanUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const htmlText = await response.text();
      return res.status(403).json({
        error: 'Shodan ha devuelto HTML inesperado en Vercel',
        snippet: htmlText.substring(0, 150)
      });
    }

    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (error) {
    return res.status(500).json({ error: 'Error interno en el proxy de Vercel', details: error.message });
  }
}
