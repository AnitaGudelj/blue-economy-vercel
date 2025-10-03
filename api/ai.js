// api/ai.js
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Use POST' });

  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    // --- 1) Priprema ulaza za model (možeš dodati svoje parametre) ---
    // Npr. prompt iz frontenda govori je li odabrana Ruta A ili B.
    const system = `Ti si AI tutor za Blue Economy. 
Daj KRATAK sažetak odluke (1 rečenica) i TRI brojke:
- vrijeme plovidbe (u satima, npr. "≈ 6 h"),
- procijenjeni trošak (u EUR, npr. "€ 2,900"),
- promjena CO₂ u % u odnosu na polaznu rutu (npr. "+40%" ili "-25%").
Formatiraj odgovor kao jasan tekst, bez dodatnih objašnjenja.`;

    const user = `Kontekst: ${prompt}.
Vrati točan redoslijed:
1) Sažetak (1 rečenica).
2) Vrijeme: ...
3) Trošak: ...
4) CO₂: ...`;

    // --- 2) Poziv prema OpenAI Responses API-ju ---
    const apiKey = process.env.OPENAI_API_KEY;
    const model  = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        input: [
          { role: 'system', content: system },
          { role: 'user',   content: user   }
        ]
      })
    });

    if (!r.ok) {
      const text = await r.text();
      // Ako OpenAI padne, vrati “mekani” fallback:
      return res.status(200).json({
        reply: '(AI fallback) Brzo, ali neekološki.',
        time:  '≈ 6 h',
        cost:  '€ 3,000',
        co2:   '+40%',
        detail: text
      });
    }

    const data = await r.json();
    // OpenAI Responses vraća output u poljima; uzmi prvi tekstualni dio
    const raw =
      data.output_text ??
      data.choices?.[0]?.message?.content ??
      JSON.stringify(data);

    // --- 3) Gruba ekstrakcija brojki iz AI teksta (regex) + defaultovi ---
    const time = raw.match(/\b≈?\s?\d+\s*h\b/i)?.[0] || '≈ 8 h';
    const cost = raw.match(/€\s?\d{1,3}(?:[.,]\d{3})*/)?.[0] || '€ 2,500';
    const co2  = raw.match(/[-+]\d{1,3}%/)?.[0] || '-20%';

    // Sažetak = prva rečenica
    const reply = raw.split('\n')[0].trim();

    return res.status(200).json({ reply, time, cost, co2 });

  } catch (e) {
    // Konačni fallback (ako dođe do greške u kodu / mreži)
    return res.status(200).json({
      reply: '(Local fallback) Sporije, ali održivije.',
      time:  '≈ 8 h',
      cost:  '€ 2,500',
      co2:   '-25%',
      error: String(e)
    });
  }
}
