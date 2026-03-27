export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const { text } = await req.json();

  if (!text || typeof text !== 'string' || text.length > 10000) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });
  }

  const isGenerateLernzettel = text.startsWith('GENERIERE_LERNZETTEL: ');
  const isGenerateBericht = text.startsWith('GENERIERE_BERICHT: ');
  const isStrukturBericht = text.startsWith('STRUKTUR_BERICHT: ');
  const isBericht = isGenerateBericht || isStrukturBericht;
  const isGenerate = isGenerateLernzettel || isGenerateBericht;

  let rawContent = null;

  if (isGenerateLernzettel) {
    rawContent = text.replace('GENERIERE_LERNZETTEL: ', '').trim();
  } else if (isGenerateBericht) {
    rawContent = text.replace('GENERIERE_BERICHT: ', '').trim();
  } else if (isStrukturBericht) {
    rawContent = text.replace('STRUKTUR_BERICHT: ', '').trim();
  }

  let topic = rawContent;
  let paramBlock = '';

  if (rawContent && rawContent.includes('\n\n')) {
    const parts = rawContent.split('\n\n');
    topic = parts[0].trim();
    paramBlock = parts.slice(1).join('\n\n').trim();
  }

  const lernzettelGeneratePrompt = `
Erstelle einen parser-sicheren, inhaltlich starken Lernzettel zum Thema: "${topic}"

WICHTIG:
Die Ausgabe muss EXAKT in einem Format sein, das ein strenger zeilenbasierter Parser sicher lesen kann.
Gib ausschließlich den finalen Lernzettel zurück.
Keine Einleitung. Keine Erklärungen. Kein Markdown-Codeblock. Keine Meta-Sätze.

${paramBlock ? `PARAMETER MIT HOHER PRIORITÄT:
${paramBlock}

Diese Parameter sind verbindliche Stil- und Inhaltsvorgaben. Halte sie ein, aber verletze NIEMALS das Ausgabeformat.
` : ''}

ZIELFORMAT:
# Präziser Titel

## Optionaler Untertitel

1. Konkreter Abschnittsname
- Inhaltspunkt auf Ebene 1
  - Unterpunkt auf Ebene 2
    - Detailpunkt auf Ebene 3

2. Konkreter Abschnittsname
- Inhaltspunkt auf Ebene 1
- Inhaltspunkt auf Ebene 1

### Optionales Zwischenlabel

**Optionaler wichtiger Hinweis**

> Merksatz: Genau ein prägnanter, fachlich sinnvoller Kernsatz

PFLICHTREGELN:
- Genau eine Titelzeile mit "# ".
- Optional direkt danach genau eine Zeile mit "## ".
- Danach nummerierte Hauptabschnitte im Format "1. ...", "2. ...", "3. ...".
- Unter jedem Abschnitt Bulletpoints mit "- ".
- Ebene 1 = 0 Leerzeichen vor "- "
- Ebene 2 = genau 2 Leerzeichen vor "- "
- Ebene 3 = genau 4 Leerzeichen vor "- "
- Keine Tabs.
- Nur echte Abschnittsnamen, keine Platzhalter wie "Erster Abschnitt" oder "Definition von X".
- Nur echter Inhalt: Definitionen, Zusammenhänge, Beispiele, Anwendungen, Ursachen, Folgen.
- Kein Fettdruck innerhalb normaler Bulletpoints, außer ein einzelnes Wort ist fachlich zwingend hervorzuheben.
- Optional genau eine Zeile mit "### ".
- Optional genau eine vollständige Zeile mit "**...**" als Callout.
- Genau ein Merksatz am Ende im Format "> Merksatz: ...", nur wenn er fachlich Mehrwert hat.
- Bei Vergleichen oder Kategorien darf eine Tabelle verwendet werden, im Format: | Spalte 1 | Spalte 2 |
- Keine Emojis.
- Keine JSON-Ausgabe.
- Keine Floskeln wie "Hier ist dein Lernzettel".
- Keine Platzhalter.
- Keine erfundenen Fakten.

OPTIONALE VISUELLE ELEMENTE (nur einsetzen wenn fachlich sinnvoll):
- Definitionskarten: ">> Begriff :: Erklärung" — für Fachbegriffe, Vokabeln, Konzepte. Mehrere hintereinander möglich.
- Prozessschritte: "=> Schritt" — für Abläufe, Algorithmen, historische Folgen. Mindestens 2, maximal 6 Schritte.
- Highlight-Badges: "!! Wert — Beschriftung" — für Schlüsselzahlen, Jahreszahlen, Kernbegriffe. Maximal 4 pro Abschnitt.
- Pro Abschnitt höchstens einen dieser Typen einsetzen. Nicht übertreiben.

INHALTLICHE PRIORITÄT:
- Erkläre das Thema fachlich korrekt, lernorientiert und konkret.
- Nutze die Parameter, um Detailgrad, Sprache, Niveau, Vorwissen und Formatierung zu steuern.
- Wenn Parameter und Format in Konflikt geraten, gilt immer das Ausgabeformat zuerst.

THEMA:
${topic}
`.trim();

  const lernzettelStructurePrompt = `
Konvertiere den folgenden Text in einen parser-sicheren, vollständigen und gut lernbaren Lernzettel.

WICHTIG:
Gib ausschließlich das Endergebnis zurück.
Keine Einleitung. Keine Erklärungen. Kein Codeblock.

ZIELFORMAT:
# Präziser Titel

## Optionaler Untertitel

1. Konkreter Abschnittsname
- Inhaltspunkt auf Ebene 1
  - Unterpunkt auf Ebene 2
    - Detailpunkt auf Ebene 3

2. Konkreter Abschnittsname
- Inhaltspunkt auf Ebene 1
- Inhaltspunkt auf Ebene 1

### Optionales Zwischenlabel

**Optionaler wichtiger Hinweis**

> Merksatz: Genau ein prägnanter, fachlich sinnvoller Kernsatz

PFLICHTREGELN:
1. VOLLSTÄNDIGKEIT:
- Jeden inhaltlich relevanten Punkt aus dem Ursprungstext übernehmen.
- Nichts Wesentliches weglassen.

2. STRUKTUR:
- Inhalte logisch ordnen, verdichten und hierarchisch gliedern.
- Nur echte Abschnittsnamen verwenden.

3. FORMAT:
- Genau eine Zeile mit "# ".
- Optional genau eine Zeile mit "## ".
- Danach nummerierte Hauptabschnitte.
- Bulletpoints mit "- ".
- Ebene 1 = 0 Leerzeichen, Ebene 2 = genau 2, Ebene 3 = genau 4.
- Keine Tabs.

4. STIL:
- Klar, kompakt, lernorientiert, fachlich korrekt.
- Kein Fettdruck in normalen Bullets.
- Keine Meta-Kommentare, keine KI-Floskeln, keine Emojis.

5. OPTIONAL:
- Genau eine "### " Zeile, wenn sie sinnvoll ist.
- Genau eine Zeile mit "**...**" als wichtiger Hinweis, wenn sie echten Mehrwert hat.
- Genau ein Merksatz am Ende im Format "> Merksatz: ...", nur wenn sinnvoll.
- Bei Vergleichen darf eine Tabelle verwendet werden: | Spalte 1 | Spalte 2 |
- Definitionskarten: ">> Begriff :: Erklärung" — nur wenn der Text Fachbegriffe enthält.
- Prozessschritte: "=> Schritt" — nur wenn ein Ablauf/Prozess beschrieben wird (min. 2, max. 6).
- Highlight-Badges: "!! Wert — Beschriftung" — nur für prägnante Zahlen oder Kernbegriffe (max. 4).
- Pro Abschnitt höchstens einen dieser optionalen Typen einsetzen.

6. SICHERHEIT:
- Keine erfundenen Informationen.
- Nur Inhalte aus dem gegebenen Text übernehmen und sauber ordnen.

TEXT:
${text}
`.trim();

  const berichtGeneratePrompt = `
Erstelle einen parser-sicheren, sachlich formulierten und klar gegliederten Bericht zum Thema: "${topic}"

WICHTIG:
Die Ausgabe muss in einem strengen, stabilen Format sein.
Gib ausschließlich den finalen Bericht zurück.
Keine Einleitung. Keine Erklärungen. Kein Codeblock. Keine Meta-Sätze.

${paramBlock ? `PARAMETER MIT HOHER PRIORITÄT:
${paramBlock}

Diese Parameter sind verbindliche Stil- und Tiefenvorgaben. Halte sie ein, aber verletze NIEMALS das Ausgabeformat.
` : ''}

ZIELFORMAT:
# Präziser, thematisch passender Titel

## Zusammenfassung
2-4 Sätze mit kompaktem Überblick.

1. Einleitung
Fließtext zu Hintergrund, Kontext und Relevanz.

2. Konkreter Themenaspekt
Fließtext mit echten Informationen.

3. Weiterer konkreter Themenaspekt
Fließtext mit echten Informationen.

4. Fazit
Fließtext mit Schlussfolgerung und Einordnung.

OPTIONAL:
> Quellenhinweis: kurzer Hinweis
> Merksatz: prägnanter Kernsatz mit echtem Mehrwert
>> Begriff :: Erklärung — für Fachbegriffe im Bericht (mehrere hintereinander möglich)
!! Wert — Beschriftung — für Schlüsselzahlen oder -fakten (max. 4 pro Abschnitt)

PFLICHTREGELN:
- Genau eine Zeile mit "# ".
- Genau eine Zeile mit "## Zusammenfassung".
- Danach 2-4 Sätze Zusammenfassung.
- Danach nummerierte Hauptabschnitte im Format "1. ...", "2. ...", "3. ...".
- Mindestens 4 Hauptabschnitte insgesamt, inklusive Einleitung und Fazit.
- In den Abschnitten normaler Fließtext.
- Keine Bulletpoints, außer sie sind fachlich wirklich deutlich sinnvoller.
- Keine Platzhalter wie "[Konkreter Themenaspekt]".
- Keine Meta-Sätze.
- Kein Markdown-Codeblock.
- Kein unnötiger Fettdruck im Fließtext.
- Bei Vergleichen darf eine Tabelle verwendet werden: | Spalte 1 | Spalte 2 |
- Optional ein Quellenhinweis.
- Optional genau ein Merksatz.
- Keine erfundenen Fakten.

INHALTLICHE PRIORITÄT:
- Nutze die Parameter, um Tiefe, Ton, Schwerpunkt und Zielgruppe zu steuern.
- Wenn Parameter und Format in Konflikt geraten, gilt immer das Ausgabeformat zuerst.

THEMA:
${topic}
`.trim();

  const berichtStructurePrompt = `
Du bist ein präziser Texteditor für sachliche Fachtexte.
Formatiere den folgenden Inhalt in einen parser-sicheren, klar gegliederten Bericht um.

WICHTIG:
Gib ausschließlich den fertigen Bericht zurück.
Keine Einleitung. Keine Erklärung. Kein Markdown-Codeblock.

ZIELFORMAT:
# Präziser, thematisch passender Titel

## Zusammenfassung
2-4 Sätze Fließtext mit dem wichtigsten Inhalt.

1. Einleitung
Fließtext zu Hintergrund, Kontext und Relevanz.

2. Konkreter Themenaspekt
Zusammenhängender Fließtext mit echten Informationen aus dem Ursprungstext.

3. Weiterer konkreter Themenaspekt
Zusammenhängender Fließtext mit echten Informationen aus dem Ursprungstext.

4. Fazit
Schlussfolgerung, Einordnung und ggf. Ausblick.

OPTIONAL:
> Quellenhinweis: Nur wenn im Ursprungstext tatsächlich Quellen erkennbar sind
> Merksatz: Genau ein prägnanter, fachlich sinnvoller Kernsatz, nur wenn er echten Mehrwert bietet

PFLICHTREGELN:
- Genau eine Zeile mit "# ".
- Genau eine Zeile mit "## Zusammenfassung".
- Danach nummerierte Hauptabschnitte im Format "1. ...", "2. ...", "3. ...".
- Mindestens 4 Hauptabschnitte insgesamt, inklusive Einleitung und Fazit.
- Nur vollständige Sätze statt Stichworte.
- Keine Platzhalter.
- Keine Meta-Sätze.
- Keine erfundenen Informationen.
- Inhalt vollständig, logisch und sachlich geordnet übernehmen.
- Keine Bulletpoints, außer sie machen es deutlich verständlicher.
- Bei Vergleichen darf eine Tabelle verwendet werden: | Spalte 1 | Spalte 2 |

TEXT:
${rawContent}
`.trim();

  const prompt = isBericht
    ? (isStrukturBericht ? berichtStructurePrompt : berichtGeneratePrompt)
    : (isGenerate ? lernzettelGeneratePrompt : lernzettelStructurePrompt);

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

  const placeholders = [
    'nur für explizit wichtige hinweise',
    'nur für wirklich wichtige hinweise',
    'callout nur für sehr wichtiges',
    'wichtiger hinweis als eigene zeile',
    'wichtiger hinweis'
  ];

  cleaned = cleaned.split('\n').map(line => {
    if (/^(\s*)\*\s+(.+)$/.test(line)) return line.replace(/^(\s*)\*\s+/, '$1- ');
    return line;
  }).join('\n');

  cleaned = cleaned.split('\n').filter(line => {
    const t = line.trim();
    if (/^\*\*.*\*\*$/.test(t)) {
      const inner = t.replace(/^\*\*\s*|\s*\*\*$/g, '').trim().toLowerCase();
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