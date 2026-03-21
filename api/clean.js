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
    ? `Erstelle einen vollständigen Lernzettel zum Thema: "${topic}".
Gib NUR den formatierten Text zurück. Keine Einleitung, keine Erklärung, kein Markdown-Codeblock.

Format:
# Titel
## Lernzettel

1. Abschnittsname
- Punkt
- Punkt
  - Unterpunkt (GENAU 2 Leerzeichen)
    - Unter-Unterpunkt (GENAU 4 Leerzeichen)

** Wichtiger Hinweis als eigene Zeile **

> Merksatz: Ein zusammenfassender Satz.

Pflichtregeln:
- Mindestens 4 Abschnitte mit je mindestens 4 Bullets
- KEIN Fettdruck (**text**) innerhalb von Bullet-Texten
- Emojis verboten
- Nur Leerzeichen für Einrückung, KEINE Tabs
- Callout ** ... ** nur für wirklich wichtige Aussagen, als eigene Zeile
- Merksatz > nur einmal ganz am Ende
- Kein Text vor oder nach dem Lernzettel`

    : `Du bist ein präziser Textformatierer. Konvertiere den folgenden Text in sauberes Lernzettel-Format.
Gib NUR den formatierten Text zurück. Keine Einleitung, keine Erklärung, kein Markdown-Codeblock.

Zielformat:
# Haupttitel (kein Doppelpunkt)
## Untertitel oder Themenangabe

1. Abschnittsname
- Bullet Ebene 1 (0 Leerzeichen)
  - Bullet Ebene 2 (GENAU 2 Leerzeichen)
    - Bullet Ebene 3 (GENAU 4 Leerzeichen)

** Nur für explizit wichtige Hinweise **

> Merksatz: Zusammenfassung in einem Satz.

Pflichtregeln:
1. VOLLSTÄNDIGKEIT: ALLE inhaltlichen Punkte übernehmen — auch wenn der Text lang ist. NICHTS kürzen oder weglassen.
2. KEINE STERNCHEN in Bullets: "- **Wort** Text" → "- Wort Text" (Fettdruck entfernen)
3. EINRÜCKUNG: Ebene 1 = 0 Leerzeichen, Ebene 2 = genau 2, Ebene 3 = genau 4. Tabs verboten.
4. BEREINIGUNG: Emojis entfernen, Trennlinien (---) entfernen, KI-Floskeln entfernen
5. ENTFERNE nicht-inhaltliche Sätze: Angebote wie "Sag mir was du brauchst", "Wenn du willst...", "Ich kann dir helfen..." → komplett weglassen
6. LABELS: Wörter die mit ":" enden (z.B. "Ziele:") als eigener Bullet belassen, Unterpunkte einrücken
7. CALLOUT: ** Text ** nur wenn im Original etwas explizit als sehr wichtig markiert ist (z.B. "Wichtig:", Ausrufezeichen, Fettdruck)
8. TITEL: Falls kein klarer Titel erkennbar → # Lernzettel setzen

Text:
${text}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 3000,
      temperature: 0.1,
      messages: [
        { role: 'user', content: prompt }
      ],
    }),
  });

  const data = await response.json();

  if (data.error) {
    let msg = data.error.message || 'Groq Fehler';
    if (data.error.code === 'rate_limit_exceeded') msg = 'Groq Limit erreicht — bitte kurz warten';
    else if (response.status === 401) msg = 'Groq API Key ungültig';
    return new Response(JSON.stringify({ error: msg }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let cleaned = data.choices?.[0]?.message?.content;
  if (!cleaned || typeof cleaned !== 'string') {
    return new Response(JSON.stringify({ error: 'Keine Antwort von Groq' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Sicherheitsnetz: Sternchen aus Bullet-Zeilen entfernen
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
