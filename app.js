const card = document.getElementById('ai-card');

async function askAI(route) {
  card.innerHTML = 'AI razmišlja…';

  const prompt = (route === 'A')
    ? 'Ruta A: brža, veća potrošnja; procijeni vrijeme, trošak, CO2 i daj preporuku.'
    : 'Ruta B: sporija, manja potrošnja; procijeni vrijeme, trošak, CO2 i daj preporuku.';

  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!res.ok) throw new Error('AI API greška');
    const data = await res.json();
    card.innerHTML = `
      <b>AI procjena (Ruta ${route})</b><br>
      <span class="badge">Vrijeme: ${data.time || '—'}</span>
      <span class="badge">Trošak: ${data.cost || '—'}</span>
      <span class="badge">CO₂: ${data.co2 || '—'}</span>
      <p>${data.reply || '—'}</p>
      <p class="muted"><i>Napomena:</i> Model daje preporuku temeljem ulaza i pretpostavki scenarija.</p>
    `;
  } catch (e) {
    card.textContent = 'Ne mogu dohvatiti AI odgovor.';
  }
}

document.querySelectorAll('button[data-route]').forEach(btn => {
  btn.addEventListener('click', () => askAI(btn.dataset.route));
});
