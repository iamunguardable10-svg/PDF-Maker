export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const { text } = await req.json();

  if (!text || typeof text !== 'string' || text.length > 10000) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });
  }

  const isGenerate = text.startsWith('GENERIERE_LERNZETTEL: ');
  const topic = isGenerate ? text.replace('GENERIERE_LERNZETTEL: ', '').trim() : null;

  const prompt = isGenerate
    ? `Erstelle einen Lernzettel zu: "${topic}".
Gib NUR den formatierten Text zurück. Keine Einleitung, keine Erklärung, kein Markdown-Codeblock.
Exaktes Zielformat:
# Titel
## Lernzettel
1. Abschnitt
- Punkt
  - Unterpunkt
    - Unter-Unterpunkt
**Wichtiger Hinweis**
> Merksatz: Ein Satz.
Regeln:
- Mindestens 4 Abschnitte
- Pro Abschnitt mindestens 4 Haupt-Bullets
- Keine Emojis
- Kein Fettdruck in normalen Bullets
- Callouts NUR als eigene Zeile im Format **Wichtiger Hinweis**
- Merksatz NUR als eigene Zeile im Format > Merksatz: ...
- Kein zusätzlicher Text vor oder nach dem Lernzettel`
    : `Konvertiere den folgenden Inhalt in ein sauberes Lernzettel-Format.
Gib NUR den formatierten Text zurück. Keine Einleitung, keine Erklärung, kein Markdown-Codeblock.
Exaktes Format:
# Titel
## Untertitel
1. Abschnitt
- Bullet
  - Sub
    - Sub-Sub
**Callout nur für sehr Wichtiges**
> Merksatz: Text
Regeln:
- Nichts Inhaltliches weglassen
- Emojis entfernen
- Trennlinien entfernen
- Tabs in Leerzeichen umwandeln
- Labels mit Doppelpunkt als eigene Bullet lassen
- Kein Fettdruck in normalen Bullets
- Falls kein klarer Titel vorhanden ist, setze # Lernzettel
Text:
${text}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
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

  if (data.error) {
    const code = data.error.code;
    let msg = data.error.message || 'Gemini Fehler';
    if (code === 429) msg = 'Gemini Limit erreicht — bitte kurz warten';
    else if (code === 403) msg = 'API Key ungültig';
    return new Response(JSON.stringify({ error: msg }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let cleaned = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!cleaned || typeof cleaned !== 'string') {
    return new Response(JSON.stringify({ error: 'Keine Antwort von Gemini' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  cleaned = cleaned
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/```(?:markdown|md)?/gi, '')
    .replace(/```/g, '')
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (/^\s*-\s/.test(line) && !/^\*\*.*\*\*$/.test(trimmed)) {
        return line.replace(/\*\*([^*]+)\*\*/g, '$1');
      }
      if (/^\*\*.*\*\*$/.test(trimmed)) {
        const inner = trimmed.replace(/^\*\*\s*|\s*\*\*$/g, '').trim();
        return inner ? `**${inner}**` : trimmed;
      }
      return line;
    })
    .join('\n')
    .trim();

  return new Response(JSON.stringify({ cleaned }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
