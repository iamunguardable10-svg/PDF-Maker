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
  const isBericht = text.startsWith('GENERIERE_BERICHT: ') || text.startsWith('STRUKTUR_BERICHT: ');
  const isStrukturBericht = text.startsWith('STRUKTUR_BERICHT: ');

  // Extract topic/text AND parameters
  // Format: "PREFIX: topic\n\nPARAMETER:\n- key: value\n..."
  let rawContent = isGenerate ? text.replace('GENERIERE_LERNZETTEL: ', '').trim()
    : isBericht ? text.replace(/^(GENERIERE_BERICHT|STRUKTUR_BERICHT): /, '').trim()
    : null;

  // Split topic from parameters if present
  let topic = rawContent;
  let paramBlock = '';
  if (rawContent && rawContent.includes('\n\n')) {
    const parts = rawContent.split('\n\n');
    topic = parts[0].trim();
    paramBlock = parts.slice(1).join('\n\n').trim();
  }

  const prompt = isBericht
    ? isStrukturBericht
      ? `Du bist ein präziser Textformatierer. Wandle den folgenden Text in einen strukturierten Bericht um.
Gib NUR den formatierten Text zurück. Kein Markdown-Codeblock, keine Einleitung.

Exaktes Format:
# [Passender Titel]

## Zusammenfassung
2-4 Sätze Fließtext als Überblick.

1. Einleitung
3-5 Sätze über Hintergrund und Bedeutung des Themas.

2. [Passender Themenaspekt]
4-6 Sätze ausführlicher Fließtext.

3. [Weiterer Themenaspekt]
4-6 Sätze ausführlicher Fließtext.

[Füge so viele Themenaspekte hinzu wie nötig — mindestens 3]

X. Fazit
3-5 Sätze Schlussfolgerungen und Ausblick.

> Quellenhinweis: Nur wenn im Original erkennbar, sonst weglassen.
Allgemein: ** Callout nur für wirklich Wichtiges **
> Merksatz: Echter inhaltlicher Satz.

REGELN: Keine Bullets, kein Fettdruck, nur #/##/Ziffern/> als Formatierung, vollständige Sätze, alle Infos behalten.
 TABELLEN: Bei Vergleichen: | Spalte 1 | Spalte 2 | Spalte X |
---
TEXT:
${rawContent}`

      : `Erstelle einen ausführlichen Bericht zum Thema: "${topic}"
Gib NUR den fertigen Bericht zurück — keine Erklärungen, keine Regeln, kein Codeblock.
${paramBlock ? `\n${paramBlock}\n` : ''}
# [Passender Titel]

## Zusammenfassung
2-4 Sätze Fließtext als Überblick.

1. Einleitung
3-5 Sätze über Hintergrund und Bedeutung des Themas.

2. [Passender Themenaspekt]
4-6 Sätze ausführlicher Fließtext.

3. [Weiterer Themenaspekt]
4-6 Sätze ausführlicher Fließtext.

[Füge so viele Themenaspekte hinzu wie das Thema erfordert — mindestens 3, so viele wie nötig]

[Letzter Abschnitt]. Fazit
3-5 Sätze Schlussfolgerungen und Ausblick.

> Quellenhinweis: Dieser Bericht basiert auf allgemeinem Fachwissen zum Thema ${topic}.

Allgemein: ** Callout nur für wirklich Wichtiges **
> Merksatz: Echter inhaltlicher Satz.

REGELN: Kein Fettdruck, keine Bullets, nur #/##/Ziffern/> als Formatierung, vollständige Sätze, ECHTER inhaltlicher Text.  TABELLEN: Bei Vergleichen: | Spalte 1 | Spalte 2 | Spalte X |`
  

    : isGenerate
    ? `Erstelle einen Lernzettel zum Thema: "${topic}"
Gib NUR den formatierten Text zurück. Keine Einleitung, keine Erklärung, kein Markdown-Codeblock.
${paramBlock ? `\nBeachte diese Parameter:\n${paramBlock}\n` : ''}
Zielformat:
# Haupttitel

1. Abschnittsname (echter Name, NICHT "Erster Abschnitt")
- Bullet Ebene 1
  - Bullet Ebene 2 (GENAU 2 Leerzeichen Einrückung)
    - Bullet Ebene 3 (GENAU 4 Leerzeichen Einrückung)
(baue Struktur und Einrückungen so wie du sie für richtig hältst)

** Callout nur für wirklich Wichtiges **

> Merksatz: Echter inhaltlicher Satz.

PFLICHTREGELN:
- KEIN Fettdruck in Bullets
- Keine Emojis, nur Leerzeichen für Einrückung
- Merksatz nur einmal am Ende
- TABELLEN: Bei Vergleichen: | Spalte 1 | Spalte 2 | Spalte X |
- ECHTER inhaltlicher Text — NIEMALS Platzhalter wie "Definition von X"`

    : `Konvertiere diesen Text in ein sauberes Lernzettel-Format. Gib NUR das Ergebnis zurück — keine Erklärungen, keine Regeln.

Zielformat:
# Haupttitel

1. Abschnittsname (echter Name, NICHT "Erster Abschnitt")
- Bullet Ebene 1
  - Bullet Ebene 2 (GENAU 2 Leerzeichen Einrückung)
    - Bullet Ebene 3 (GENAU 4 Leerzeichen Einrückung)

** Callout nur für wirklich Wichtiges **

> Merksatz: Echter inhaltlicher Satz.

PFLICHTREGELN:
1. VOLLSTÄNDIGKEIT: Jeden Inhaltspunkt übernehmen, NICHTS weglassen oder kürzen
2. EINRÜCKUNG: Ebene 1 = 0 Leerzeichen, Ebene 2 = genau 2, Ebene 3 = genau 4. Keine Tabs.
3. KEINE STERNCHEN in Bullets: "- **Wort**" → "- Wort"
4. KEIN ##: Nur "# Titel" einmal oben, dann direkt nummerierte Abschnitte
5. ECHTE ABSCHNITTSNAMEN: Nie "Erster Abschnitt" — immer den Themenname
6. BEREINIGUNG: Emojis, Trennlinien, KI-Floskeln, Angebote wie "Sag mir was du brauchst" entfernen
7. TABELLEN: Bei Vergleichen oder tabellarischen Daten: | Spalte 1 | Spalte 2 |

---
TEXT:
${text}`;

  // Truncate very long inputs to avoid timeout
  const maxChars = 6000;
  const truncatedPrompt = prompt.length > maxChars
    ? prompt.slice(0, maxChars) + '\n\n[Text wurde gekürzt]'
    : prompt;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 3000,
      temperature: 0.1,
      messages: [
        { role: 'user', content: truncatedPrompt }
      ],
    }),
  });
  clearTimeout(timeout);

  const data = await response.json();

  if (data.error) {
    let msg = data.error.message || 'Groq Fehler';
    if (data.error.code === 'rate_limit_exceeded') msg = 'Limit erreicht — bitte 1 Minute warten';
    else if (response.status === 401) msg = 'API Key ungültig';
    else if (data.error.code === 'context_length_exceeded') msg = 'Text zu lang — bitte kürzen';
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

  // Platzhalter-Callouts entfernen
  const placeholders = ['nur für explizit wichtige hinweise','nur für wirklich wichtige hinweise','callout nur für sehr wichtiges','wichtiger hinweis als eigene zeile'];

  // Remove stray asterisks used as bullet markers (e.g. "* Punkt" -> "- Punkt")
  cleaned = cleaned.split('\n').map(line => {
    if (/^(\s*)\*\s+(.+)$/.test(line)) {
      return line.replace(/^(\s*)\*\s+/, '$1- ');
    }
    return line;
  }).join('\n');

  cleaned = cleaned.split('\n').filter(line => {
    const t = line.trim();
    if (/^\*\*.*\*\*$/.test(t)) {
      const inner = t.replace(/^\*\*\s*|\s*\*\*$/g,'').trim().toLowerCase();
      if (placeholders.some(p => inner.includes(p))) return false;
    }
    return true;
  }).join('\n');

  // Sicherheitsnetz: Sternchen aus Bullets entfernen + bereinigen
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
    .replace(/^(## .+)\n(\d+\.\s+\1)/gm, '$2')
    .replace(/^(\d+\.\s+.+)\n(## \1)/gm, '$1')
    .replace(/^> Merksatz: (Zusammenfassung in einem Satz\.?|\[.*?\])$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return new Response(JSON.stringify({ cleaned }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
