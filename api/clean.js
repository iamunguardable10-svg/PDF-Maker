export const config = { runtime: 'edge' };

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function normalizeCleanedText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '  ')
    .split('\n')
    .map(line => {
      const trimmed = line.trim();

      if (/^\*\*\s*.*?\s*\*\*$/.test(trimmed)) {
        return trimmed.replace(/^\*\*\s*|\s*\*\*$/g, match => match.includes('**') ? '**' : match);
      }

      if (/^\s*-\s/.test(line) && !/^\s*\*\*.*\*\*\s*$/.test(trimmed)) {
        return line.replace(/\*\*([^*]+)\*\*/g, '$1');
      }

      return line;
    })
    .join('\n')
    .replace(/^\*\*\s*(.*?)\s*\*\*$/gm, '**$1**')
    .trim();
}

function isGenerateRequest(text) {
  return typeof text === 'string' && text.startsWith('GENERIERE_LERNZETTEL: ');
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Ungültiger Request-Body' }, 400);
  }

  const text = body?.text;

  if (!text || typeof text !== 'string' || text.length > 10000) {
    return jsonResponse({ error: 'Invalid input' }, 400);
  }

  if (!process.env.GOOGLE_API_KEY) {
    return jsonResponse({ error: 'GOOGLE_API_KEY fehlt auf dem Server' }, 500);
  }

  const isGenerate = isGenerateRequest(text);
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
- Callouts nur im Format **Wichtiger Hinweis**
- Falls kein klarer Titel vorhanden ist, formuliere einen passenden Titel
- Falls keine klare Unterzeile vorhanden ist, setze ## Lernzettel

Text:
${text}`;

  let response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 3000,
            temperature: 0.1
          }
        }),
      }
    );
  } catch {
    return jsonResponse({ error: 'Netzwerkfehler beim KI-Aufruf' }, 200);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return jsonResponse({ error: 'Ungültige Antwort von Gemini' }, 200);
  }

  if (!response.ok) {
    const apiMsg = data?.error?.message;
    return jsonResponse({
      error: apiMsg || `HTTP-Fehler von Gemini: ${response.status}`
    }, 200);
  }

  if (data.error) {
    const code = data.error.code;
    let msg = 'KI-Fehler';

    if (code === 429) msg = 'Gemini Limit erreicht — bitte kurz warten';
    else if (code === 400) msg = 'Ungültige Anfrage an Gemini';
    else if (code === 403) msg = 'API Key ungültig';
    else msg = data.error.message || 'Unbekannter Gemini-Fehler';

    return jsonResponse({ error: msg }, 200);
  }

  let cleaned = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!cleaned || typeof cleaned !== 'string') {
    return jsonResponse({ error: 'Keine Antwort von Gemini erhalten' }, 200);
  }

  cleaned = normalizeCleanedText(cleaned);

  return jsonResponse({ cleaned }, 200);
}
