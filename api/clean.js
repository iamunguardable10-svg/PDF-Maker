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

  let rawContent = isGenerate ? text.replace('GENERIERE_LERNZETTEL: ', '').trim()
    : isBericht ? text.replace(/^(GENERIERE_BERICHT|STRUKTUR_BERICHT): /, '').trim()
    : null;

  let topic = rawContent;
  let paramBlock = '';
  if (rawContent && rawContent.includes('\n\n')) {
    const parts = rawContent.split('\n\n');
    topic = parts[0].trim();
    paramBlock = parts.slice(1).join('\n\n').trim();
  }

  const prompt = isBericht
    ? isStrukturBericht
      ? `Du bist ein präziser Texteditor für sachliche Fachtexte. Formatiere den folgenden Inhalt in einen klar gegliederten Bericht um, und führe den Inhalt aus/ arbeite Zusammenhänge raus.
Gib ausschließlich den fertigen Bericht zurück. Keine Einleitung, keine Erklärung, kein Markdown-Codeblock.

ZIELFORMAT:
# [Präziser, thematisch passender Titel]

## Zusammenfassung
2-4 Sätze Fließtext mit dem wichtigsten Inhalt in kompakter Form.

1. Einleitung
Fließtext zu Hintergrund, Kontext und Relevanz des Themas.

2. [Konkreter Themenaspekt]
Zusammenhängender Fließtext mit echten Informationen aus dem Ausgangstext.

3. [Weiterer konkreter Themenaspekt]
Zusammenhängender Fließtext mit echten Informationen aus dem Ausgangstext.

[Füge so viele nummerierte Hauptabschnitte hinzu wie nötig — mindestens 3. Abschnittsnummern fortlaufend: 1, 2, 3 ...]

[Höchste Nummer + 1]. Fazit
Schlussfolgerung, Einordnung und ggf. Ausblick — so viele Sätze wie nötig.

OPTIONAL:
> Quellenhinweis: Nur einfügen, wenn im Ursprungstext tatsächlich Quellen erkennbar sind. Sonst weglassen.
> Merksatz: Genau ein prägnanter, fachlich sinnvoller Kernsatz, nur wenn er echten Mehrwert bietet.
**[Wichtiger Hinweis]**


REGELN:
- Keine Bullets, außer sie machen es deutlich übersichtlicher und verständlicher
- kein Fettdruck im Fließtext, nur bei extrem wichtigen Wörtern
- Nur #, ##, nummerierte Hauptabschnitte, > für optionale Hinweise
- Vollständige Sätze statt Stichworte
- Keine Informationen erfinden, keine Platzhalter im Ergebnis
- Inhalt vollständig und logisch geordnet übernehmen
- Bei Vergleichen oder wenn es sich anbietet darf und soll eine Tabelle verwendet werden: | Spalte 1 | Spalte 2 |

TEXT:
${rawContent}`

      : `Erstelle einen sachlich formulierten, klar gegliederten Bericht zum Thema: "${topic}"
Gib ausschließlich den fertigen Bericht zurück. Keine Erklärungen, keine Regeln, kein Codeblock.
${paramBlock ? `\nZusätzliche Vorgaben:\n${paramBlock}\n` : ''}
ZIELFORMAT:
# [Präziser, thematisch passender Titel]

## Zusammenfassung
Fließtext mit Überblick über das Thema.

1. Einleitung
Fließtext zu Hintergrund, Einordnung und Relevanz.

2. [Konkreter Themenaspekt]
Ausführlicher, sachlicher Fließtext — so viele Sätze wie nötig.

3. [Weiterer konkreter Themenaspekt]
Ausführlicher, sachlicher Fließtext — so viele Sätze wie nötig.

[Füge so viele nummerierte Hauptabschnitte hinzu wie das Thema erfordert — mindestens 3. Die Abschnittsnummern müssen fortlaufend sein: 1, 2, 3, 4 ... KEINE Buchstaben oder X.]

[Höchste Nummer + 1]. Fazit
Schlussfolgerungen und ggf. Ausblick.

Optional:
> Quellenhinweis: Dieser Bericht basiert auf allgemeinem Fachwissen zum Thema ${topic}.
**[Wichtiger Hinweis]**
> Merksatz: [Nur einfügen wenn er echten Mehrwert hat — ein prägnanter Kernsatz der das Wichtigste zusammenfasst]

REGELN:
- Keine Bullets, außer sie machen es deutlich übersichtlicher und verständlicher
- kein Fettdruck im Fließtext, nur bei extrem wichtigen Wörtern
- Nur #, ##, nummerierte Hauptabschnitte, > für optionale Hinweise
- Vollständige Sätze statt Stichworte
- Keine Informationen erfinden, keine Platzhalter im Ergebnis
- Inhalt vollständig und logisch geordnet übernehmen
- Bei Vergleichen oder wenn es sich anbietet darf und soll eine Tabelle verwendet werden: | Spalte 1 | Spalte 2 |Spalte [X]`

    : isGenerate
    ? `Erstelle einen klar strukturierten, inhaltlich dichten Lernzettel zum Thema: "${topic}"
Gib ausschließlich den formatierten Lernzettel zurück. Keine Einleitung, keine Erklärung, kein Markdown-Codeblock.
${paramBlock ? `\nBeachte diese zusätzlichen Vorgaben:\n${paramBlock}\n` : ''}
ZIELFORMAT:
# Haupttitel

1. Konkreter Abschnittsname
- Inhaltspunkt auf Ebene 1
  - Unterpunkt auf Ebene 2 (genau 2 Leerzeichen Einrückung)
    - Detailpunkt auf Ebene 3 (genau 4 Leerzeichen Einrückung)

[Baue die Struktur fachlich sinnvoll auf. Nutze echte Abschnittsnamen, keine Platzhalter. Unterpunkte und Detailpunkte nur wenn du sie für sinnvoll hälst]

**[Wichtiger Hinweis]**

> Merksatz: Genau ein prägnanter, fachlich sinnvoller Kernsatz.

PFLICHTREGELN:
- Nur echter Inhalt, keine Platzhalter wie "Definition von X" oder "Erster Abschnitt"
- Klar, kompakt, lernorientiert und fachlich korrekt formulieren
- KEIN Fettdruck innerhalb von Bullets, außer du hebst damit wirklich wichtige (Fach)wörter hervor
- Keine Emojis, nur Leerzeichen für Einrückungen
- Ebene 1 = 0 Leerzeichen, Ebene 2 = genau 2, Ebene 3 = genau 4
- Merksatz genau einmal am Ende
- Callout (wichtiger Hinweis) bei wirklich zentralem Hinweis
- Bei Vergleichen soll eine Tabelle verwendet werden: | Spalte 1 | Spalte 2 |
- Keine Meta-Sätze wie "hier ist dein Lernzettel"`

    : `Konvertiere den folgenden Text in ein sauberes, vollständiges und gut lernbares Lernzettel-Format.
Gib ausschließlich das Ergebnis zurück. Keine Erklärungen, keine Regeln, kein Codeblock.

ZIELFORMAT:
# Haupttitel

1. Konkreter Abschnittsname
- Inhaltspunkt auf Ebene 1
  - Unterpunkt auf Ebene 2 (genau 2 Leerzeichen Einrückung)
    - Detailpunkt auf Ebene 3 (genau 4 Leerzeichen Einrückung)

**[Wichtiger Hinweis]**

> Merksatz: Genau ein prägnanter, fachlich sinnvoller Kernsatz.

PFLICHTREGELN:
1. VOLLSTÄNDIGKEIT: Jeden inhaltlich relevanten Punkt übernehmen. Nichts Wesentliches weglassen.
2. STRUKTUR: Inhalte logisch ordnen, zusammenfassen und hierarchisch gliedern.
3. EINRÜCKUNG: Ebene 1 = 0 Leerzeichen, Ebene 2 = genau 2, Ebene 3 = genau 4. Keine Tabs. Entscheide selbst wie du den Text optisch sauber ordnest
4. KEIN FETTDRUCK IN BULLETS: Keine "- **Begriff**" Formulierungen.
5. NUR EIN HAUPTTITEL: Genau einmal "# Titel" oben. Danach direkt nummerierte Abschnitte, kein "##".
6. ECHTE ABSCHNITTSNAMEN: Keine Platzhalter, sondern fachlich passende Überschriften.
7. BEREINIGUNG: Emojis, Trennlinien, KI-Floskeln, Meta-Kommentare entfernen.
8. TABELLEN: Bei Vergleichen eine Tabelle verwenden: | Spalte 1 | Spalte 2 |
9. MERKSATZ: Genau einmal am Ende, nur mit echtem fachlichem Mehrwert.
10. KEINE ERFINDUNGEN: Nur Inhalte aus dem gegebenen Text übernehmen.

---
TEXT:
${text}`;

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
      messages: [{ role: 'user', content: truncatedPrompt }],
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

  const placeholders = ['nur für explizit wichtige hinweise','nur für wirklich wichtige hinweise','callout nur für sehr wichtiges','wichtiger hinweis als eigene zeile'];

  cleaned = cleaned.split('\n').map(line => {
    if (/^(\s*)\*\s+(.+)$/.test(line)) return line.replace(/^(\s*)\*\s+/, '$1- ');
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
