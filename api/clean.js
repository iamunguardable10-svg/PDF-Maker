export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { text } = await req.json();

  if (!text || text.length > 10000) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });
  }

  // Check if this is a generate-from-topic request
  const isGenerate = text.startsWith('GENERIERE_LERNZETTEL: ');
  const topic = isGenerate ? text.replace('GENERIERE_LERNZETTEL: ', '').trim() : null;

  const prompt = isGenerate
    ? `Erstelle einen Lernzettel zu: "${topic}". Genau dieses Format, NUR Text zurück:
# Titel
## Lernzettel
1. Abschnitt
- Punkt (kein **fett** in Bullets)
  - Unterpunkt (2 Leerzeichen)
** Wichtiger Hinweis **
> Merksatz: Ein Satz.
Mindestens 4 Abschnitte, 4 Bullets pro Abschnitt.`
    : `Konvertiere diesen Text in Lernzettel-Format. NUR formatierten Text zurückgeben, keine Erklärungen.
Format:
# Titel
## Untertitel
1. Abschnitt
- Bullet (kein **fett** in Bullets, Sternchen entfernen)
  - Sub (2 Leerzeichen)
    - Sub-Sub (4 Leerzeichen)
** Callout nur für sehr Wichtiges **
> Merksatz: Text
Regeln: Nichts weglassen. Emojis/Trennlinien entfernen. Tabs→Leerzeichen. Labels mit Doppelpunkt als eigener Bullet.
Text: ${text}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 3000, temperature: 0.1 }
      }),
    }
  );

  const data = await response.json();

  // Fehler von Gemini direkt abfangen und als error zurückgeben
  if (data.error) {
    const code = data.error.code;
    let msg = 'KI-Fehler';
    if (code === 429) msg = 'Gemini Limit erreicht — bitte kurz warten';
    else if (code === 400) msg = 'Ungültige Anfrage an Gemini';
    else if (code === 403) msg = 'API Key ungültig';
    else msg = data.error.message || 'Unbekannter Gemini-Fehler';
    return new Response(JSON.stringify({ error: msg }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let cleaned = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!cleaned) {
    return new Response(JSON.stringify({ error: 'Keine Antwort von Gemini erhalten' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Sicherheitsnetz: Sternchen in Bullet-Zeilen entfernen
  cleaned = cleaned
    .split('\n')
    .map(line => {
      if (/^\s*-\s/.test(line) && !/^\*\*.*\*\*$/.test(line.trim())) {
        return line.replace(/\*\*([^*]+)\*\*/g, '$1');
      }
      return line;
    })
    .join('\n');

  return new Response(JSON.stringify({ cleaned }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
