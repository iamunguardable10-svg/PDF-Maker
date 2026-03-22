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
  const topic = isGenerate ? text.replace('GENERIERE_LERNZETTEL: ', '').trim()
    : isBericht ? text.replace(/^(GENERIERE_BERICHT|STRUKTUR_BERICHT): /, '').trim()
    : null;

  const prompt = isBericht
    ? isStrukturBericht
      ? `Du bist ein präziser Textformatierer. Wandle den folgenden Text in einen strukturierten Bericht um.
Gib NUR den formatierten Text zurück. Kein Markdown-Codeblock, keine Einleitung.

Exaktes Format — halte dich GENAU daran:
# Titel des Berichts

## Zusammenfassung
Hier 2-4 Sätze Fließtext als zusammenfassender Überblick.

1. Abschnittsname
Hier 3-5 vollständige Sätze als Fließtext. Kein Bullet. Kein Fettdruck.

2. Zweiter Abschnittsname
Weitere Sätze als Fließtext.

> Quellenhinweis: Nur wenn im Original erkennbar, sonst weglassen.

STRIKTE REGELN:
- KEIN Fettdruck (**text**) — nirgendwo
- KEINE Bulletpoints (- oder •) — nirgendwo
- KEINE Markdown-Formatierung außer #, ##, Ziffern und >
- Nur vollständige Sätze im Fließtext
- Alle Informationen aus dem Original behalten
- Falls kein Titel → # Bericht

Text:
${topic}`
      : `Erstelle einen ausführlichen Bericht zum Thema: "${topic}"
Gib NUR den formatierten Text zurück. Kein Markdown-Codeblock, keine Einleitung.

Exaktes Format — halte dich GENAU daran:
# [Passender Titel zum Thema]

## Zusammenfassung
2-4 Sätze Fließtext als Überblick über das Thema.

1. Einleitung
3-5 Sätze Fließtext über Hintergrund und Bedeutung des Themas.

2. [Themenaspekt 1]
4-6 Sätze ausführlicher Fließtext.

3. [Themenaspekt 2]
4-6 Sätze ausführlicher Fließtext.

4. [Themenaspekt 3]
4-6 Sätze ausführlicher Fließtext.

5. Fazit
3-5 Sätze Schlussfolgerungen und Ausblick.

> Quellenhinweis: Dieser Bericht basiert auf allgemeinem Fachwissen zum Thema ${topic}.

STRIKTE REGELN:
- KEIN Fettdruck (**text**) — nirgendwo im Text
- KEINE Bulletpoints (- oder •) — nirgendwo
- KEINE Markdown-Formatierung außer #, ##, Ziffern und >
- Nur vollständige Fließtext-Sätze
- ECHTEN inhaltlichen Text — keine Platzhalter wie [Fließtext] oder [Abschnitt]
- Zusammenfassung IMMER direkt nach dem Titel`
    : isGenerate
    ? `Erstelle einen Lernzettel. Die genauen Parameter stehen unten.
Gib NUR den formatierten Text zurück. Keine Einleitung, keine Erklärung, kein Markdown-Codeblock.

Format:
# Titel

1. Abschnittsname
- Bullet oder Satz je nach Format-Parameter
  - Unterpunkt

** Wichtiger Hinweis als eigene Zeile **

> Merksatz: Ein zusammenfassender Satz.

ABSOLUTE PFLICHTREGELN:
- KEIN Fettdruck in Bullets
- Keine Emojis
- Nur Leerzeichen für Einrückung
- Merksatz nur einmal am Ende
- TABELLEN: Bei Vergleichen: | Spalte 1 | Spalte 2 |
- KRITISCH: Schreibe ECHTEN inhaltlichen Text mit konkreten Fakten. NIEMALS Platzhalter wie "Definition von X", "Erklärung von Y", "Beispiel für Z" — immer die echte Definition/Erklärung/das echte Beispiel hinschreiben.

${topic}`

    : `Du bist ein präziser Textformatierer. Konvertiere den folgenden Text EXAKT in dieses Format:

# Haupttitel

1. Abschnittsname
- Bullet
  - Unterpunkt
    - Unter-Unterpunkt

2. Zweiter Abschnittsname
- Bullet

** Nur für wirklich wichtige Hinweise **

> Merksatz: Echter inhaltlicher Satz.

KRITISCHE REGELN:

A) KEIN ##: Verwende NIEMALS "##". Nur "# Titel" einmal ganz oben, dann direkt "1. Abschnitt", "2. Abschnitt" usw.

B) ECHTE ABSCHNITTSNAMEN: NIEMALS "Erster Abschnitt", "Zweiter Abschnitt" usw. Immer den echten Inhaltsnamen verwenden, z.B. "1. Wirtschaftsordnungen".

C) VOLLSTÄNDIGKEIT: Alle Inhaltspunkte übernehmen, nichts weglassen, nichts kürzen.

D) KEINE STERNCHEN in Bullets: "- **Wort**" wird zu "- Wort"

E) EINRÜCKUNG: 0 Leerzeichen für Ebene 1, genau 2 für Ebene 2, genau 4 für Ebene 3. Keine Tabs.

F) BEREINIGUNG: Emojis, Trennlinien (---), KI-Floskeln, Angebote wie "Sag mir was du brauchst" entfernen.

G) CALLOUT: ** Text ** nur für explizit wichtige Aussagen, als eigene Zeile.

H) MERKSATZ: Echter inhaltlicher Satz am Ende. NICHT den Platzhalter wörtlich übernehmen.
I) TABELLEN: Wenn der Original-Text Vergleiche, Gegenüberstellungen oder tabellarische Daten enthält, stelle sie als Markdown-Tabelle dar:
  | Spalte 1 | Spalte 2 |
  | Wert A   | Wert B   |

Text:
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
  cleaned = cleaned.split('\n').filter(line => {
    const t = line.trim();
    if (/^\*\*.*\*\*$/.test(t)) {
      const inner = t.replace(/^\*\*\s*|\s*\*\*$/g,'').trim().toLowerCase();
      if (placeholders.some(p => inner.includes(p))) return false;
    }
    return true;
  }).join('\n');

  // Sicherheitsnetz: Sternchen aus Bullets entfernen + Duplikate bereinigen
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
    // Duplikate entfernen: ## Titel direkt gefolgt von 1. Titel (gleicher Text)
    .replace(/^(## .+)\n(\d+\.\s+\1)/gm, '$2')
    .replace(/^(\d+\.\s+.+)\n(## \1)/gm, '$1')
    // Leere Merksatz-Platzhalter entfernen
    .replace(/^> Merksatz: (Zusammenfassung in einem Satz\.?|\[.*?\])$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return new Response(JSON.stringify({ cleaned }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
