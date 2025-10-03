// api/ai.js
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Use POST' });

  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    // helper za “življe” mock vrijednosti
    const jitter = (base, pct = 0.12, digits = 1) => {
      const d = base * pct;
      const v = base + (Math.random() * 2 - 1) * d;
      const m = Math.pow(10, digits);
      return Math.round(v * m) / m;
    };

    // ako nema ključa, odmah fallback (ali varijabilan) + jasan “source”
    if (!process.env.OPENAI_API_KEY) {
      const isA = /ruta\s*A/i.test(prompt);
      const out = isA
        ? { time: `≈ ${jitter(6, 0.15)} h`, cost: `€ ${Math.round(jitter(3000,0.12)).toLocaleString('en-US')}`, co2: `+${Math.round(jitter(40,0.2))}%`, reply: 'Brzo, ali neekološki.', source: 'fallback:no-key' }
        : { time: `≈ ${jitter(8, 0.15)} h`, cost: `€ ${Math.round(jitter(2500,0.12)).toLocaleString('en-US')}`, co2: `-${Math.round(jitter(25,0.2))}%`, reply: 'Sporije, ali održivije.', source: 'fallback:no-key' };
      return res.status(200).json(out);
    }

    const system = `Ti si AI tutor za nautičke odluke (Blue Economy).
Vrati kratku preporuku (1 rečenica) i tri brojke:
- Vrijeme (npr. "≈ 6 h")
- Trošak u EUR (npr. "€ 2,900")
- CO₂ promjena u postocima (npr. "+40%" ili "-25%")`;

    const user = `Kontekst: ${prompt}.
Vrati točno ovaj redoslijed u novim linijama:
1) Sažetak: ...
2) Vrijeme: ...
3) Trošak: ...
4) CO₂: ...`;

    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        input: [
          { role: 'system', content: system },
          { role: 'user',   content: user }
        ]
      })
    });

    if (!r.ok) {
      const detail = await r.text();      // pokaži stvarnu grešku
      console.error('OpenAI error:', r.status, detail);
      return res.status(502).json({ error: 'OpenAI failed', status: r.status, detail, source: 'fallback:ai-error' });
    }

    const data = await r.json();
    // log za Vercel Logs → Functions
    console.log('RAW OpenAI response:', JSON.stringify(data));

    const raw =
      data.output_text ??
      data.choices?.[0]?.message?.content ??
      '';

    const time = raw.match(/\b≈?\s?\d+(\.\d+)?\s*h\b/i)?.[0] || `≈ ${jitter(7,0.15)} h`;
    const cost = raw.match(/€\s?\d{1,3}(?:[.,]\d{3})*/)?.[0] || `€ ${Math.round(jitter(2800,0.12)).toLocaleString('en-US')}`;
    const co2  = raw.match(/[-+]\d{1,3}%/)?.[0] || `${Math.random()<0.5?'+':'-'}${Math.round(jitter(20,0.25))}%`;
    const reply = (raw.split('\n').find(l => /Sažetak/i.test(l)) || raw.split('\n')[0] || 'Procjena rute.').replace(/^1\)\s*Sažetak:\s*/i, '').trim();

    return res.status(200).json({ reply, time, cost, co2, source: 'ai' });

  } catch (e) {
    console.error('Server error:', e);
    return res.status(500).json({ error: 'Server error', detail: String(e), source: 'fallback:server' });
  }
}
