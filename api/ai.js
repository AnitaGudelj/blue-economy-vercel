export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Use POST' });

  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    // MOCK odgovor – dovoljno za demo
    const mock = /Ruta A/i.test(prompt)
      ? { time: '≈6 h', cost: '€ 3,000', co2: '+40%', reply: 'Brzo, ali neekološki.' }
      : { time: '≈8 h', cost: '€ 2,500', co2: '-25%', reply: 'Sporije, ali održivije.' };

    return res.status(200).json(mock);
  } catch (e) {
    return res.status(500).json({ error: 'Server error', details: String(e) });
  }
}
