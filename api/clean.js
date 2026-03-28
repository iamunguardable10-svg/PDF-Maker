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

ZIELFORMAT (wähle pro Abschnitt das thematisch passende Format — Reihenfolge ist frei):

Format A — Definitionen (für Fachbegriffe):
1. Themenspezifischer Abschnittsname
>> Begriff :: Präzise Erklärung in einem Satz
>> Weiterer Begriff :: Erklärung

Format B — Ablauf/Prozess (für Schrittfolgen, Algorithmen):
2. Themenspezifischer Abschnittsname
=> Erster konkreter Schritt
=> Zweiter konkreter Schritt

Format C — Kennzahlen/Fakten (für Jahreszahlen, Werte, Formeln):
3. Themenspezifischer Abschnittsname
!! 1905 — Einsteins Relativitätstheorie
!! $E = mc^2$ — Masse-Energie-Äquivalenz
!! $F = m \cdot a$ — Newtonsches Gesetz

Format D — Vergleich/Gegenüberstellung:
4. Themenspezifischer Abschnittsname
<> Merkmal A :: Merkmal B
<> Aspekt X :: Aspekt Y

Format E — Bulletpoints (für Aufzählungen, Erklärungen):
5. Themenspezifischer Abschnittsname
- Inhaltspunkt auf Ebene 1
  - Unterpunkt auf Ebene 2
    - Detailpunkt auf Ebene 3

Format F — Tabelle (für strukturierte Vergleiche):
6. Themenspezifischer Abschnittsname
| Spalte 1 | Spalte 2 |
| Wert A | Wert B |

Format G — Chronologie/Timeline (für historische Ereignisse, Entwicklungen):
7. Themenspezifischer Abschnittsname
~~ 1905 :: Einstein veröffentlicht die Spezielle Relativitätstheorie
~~ 1915 :: Allgemeine Relativitätstheorie folgt

Format H — Zitat (für wichtige Aussagen, Definitionen durch bekannte Personen):
8. Themenspezifischer Abschnittsname
"" Das Ganze ist mehr als die Summe seiner Teile — Aristoteles

Format I — Formelbox (für wichtige mathematische Formeln hervorgehoben):
9. Themenspezifischer Abschnittsname
@@ $E = mc^2$ — Masse-Energie-Äquivalenz
@@ $F = m \cdot a$ — Zweites Newtonsches Gesetz

> Merksatz: Genau ein prägnanter, fachlich sinnvoller Kernsatz

PFLICHTREGELN:
- Genau eine Titelzeile mit "# ".
- Optional direkt danach genau eine Zeile mit "## ".
- Danach nummerierte Hauptabschnitte im Format "1. ...", "2. ...", "3. ...".
- Unter jedem Abschnitt entweder Bulletpoints ("- ") ODER eines der visuellen Elemente — nie beides mischen.
- Ebene 1 = 0 Leerzeichen vor "- ", Ebene 2 = 2 Leerzeichen, Ebene 3 = 4 Leerzeichen. Keine Tabs.
- Abschnittsnamen MÜSSEN themenspezifisch sein — NIEMALS generische Namen wie "Grundlagen", "Einleitung", "Übersicht", "Definition". Abschnittsnamen NIEMALS in **fett** schreiben.
- "### Zwischenlabel" NUR wenn direkt danach Inhalt folgt — NIEMALS als letztes Element einer Sektion.
- Optional genau eine vollständige Zeile mit "**...**" als Callout.
- Genau ein Merksatz am Ende im Format "> Merksatz: ...", nur wenn fachlich sinnvoll.
- Bei Vergleichen darf eine Tabelle verwendet werden: | Spalte 1 | Spalte 2 |
- Keine Emojis, keine Floskeln, keine erfundenen Fakten.
- NIEMALS einen Abschnitt ohne Inhalt generieren. Jeder nummerierte Abschnitt muss mindestens 2 Bulletpoints oder ein visuelles Element enthalten.
- PFLICHT: Mindestens 3 verschiedene Formate (A–I) pro Lernzettel verwenden — kein Lernzettel darf nur Bulletpoints enthalten.
- PFLICHT: Wähle Formate nach dem Thema, nicht nach der Reihenfolge im ZIELFORMAT.

VISUELLE ELEMENTE — setze mindestens 2 davon pro Lernzettel ein, wo es fachlich passt:
- ">> Begriff :: Erklärung" — für Fachbegriffe (mehrere hintereinander, ersetzen Bullets komplett im Abschnitt)
- "=> Schritt" — für Abläufe, Algorithmen, Prozesse (min. 2, max. 6 Schritte, ersetzen Bullets im Abschnitt)
- "!! Wert — Beschriftung" — für Jahreszahlen, Kennzahlen, Kernformeln (max. 4 pro Abschnitt, können vor Bullets stehen)
- "<> Links :: Rechts" — für Vergleiche, Pro/Contra (mehrere hintereinander, ersetzen Bullets im Abschnitt)
- WICHTIG für "<>": Immer dann verwenden wenn zwei Dinge verglichen, gegenübergestellt oder mit "und/&/vs./oder" in einem Bullet kombiniert werden. Beispiele die IMMER als <> geschrieben werden müssen:
    × FALSCH:  - Schriftliche Tests & Mündliche Tests
    ✓ RICHTIG: <> Schriftliche Tests :: Mündliche Tests
    × FALSCH:  - Vor- und Nachteile
    ✓ RICHTIG: <> Vorteile :: Nachteile
    × FALSCH:  - Klassische vs. Quantenmechanik
    ✓ RICHTIG: <> Klassische Mechanik :: Quantenmechanik
- "$Formel$" inline oder "$$Formel$$" als Block — nur für echte Mathematik, in Bullets oder !! einbetten
- "~~ Datum :: Ereignis" — für chronologische Abfolgen, Zeitstrahlen, historische Daten (mehrere hintereinander)
- '"" Zitat — Autor" — für bedeutende Aussagen, Definitionen bekannter Persönlichkeiten
- "@@ $Formel$ — Bezeichnung" — für besonders wichtige Formeln als hervorgehobene Formelbox (max. 3 pro Abschnitt)

INHALTLICHE PRIORITÄT:
- Erkläre das Thema fachlich korrekt, lernorientiert und konkret.
- Nutze die Parameter, um Detailgrad, Sprache, Niveau, Vorwissen und Formatierung zu steuern.
- Wenn Parameter und Format in Konflikt geraten, gilt immer das Ausgabeformat zuerst.
- Verwende die visuellen Elemente so:
  • ">>" für Definitionen/Fachbegriffe: >> Osmose :: Passiver Transport von Wasser durch semipermeable Membran
  • "=>" für Prozessschritte: => Primer anlagern, => DNA-Polymerase synthetisiert neuen Strang
  • "!!" für Zahlen/Daten/Formeln: !! 1953 — Watson & Crick entdecken Doppelhelix | !! $F = ma$ — Zweites Newtonsches Gesetz
  • "<>" für Gegenüberstellungen: <> Mitose :: Zellteilung für Wachstum :: Meiose :: Zellteilung für Fortpflanzung
  • "~~" für Zeitstrahlen: ~~ 1789 :: Beginn der Französischen Revolution — NUR für chronologische Ereignisse
  • '""' für Zitate: "" Der Mensch ist ein soziales Wesen — Aristoteles — NUR wenn wirklich ein bekanntes Zitat passt
  • "@@" für Formelboxen: @@ $\Delta G = \Delta H - T\Delta S$ — Gibbs-Helmholtz-Gleichung — NUR für die 1-3 zentralsten Formeln

UNTERSTÜTZTE SYNTAX (optional, nur wenn sinnvoll):
- "### Label" als Zwischenüberschrift innerhalb eines Abschnitts (NUR wenn Inhalt folgt!)
- "> Merksatz: ..." für einen prägnanten Kernsatz am Ende
- "**Wichtiger Hinweis**" als Callout-Box
- "| Spalte 1 | Spalte 2 |" für Vergleichstabellen
- "$Formel$" für mathematische Ausdrücke in KaTeX-Syntax, z.B. "$E = mc^2$", "$\\frac{a}{b}$" — NIEMALS Formeln in normale Klammern schreiben

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
- Abschnittsnamen MÜSSEN themenspezifisch sein — NIEMALS "Grundlagen", "Einleitung", "Übersicht", "Definition" oder andere generische Namen. Immer das konkrete Teilthema benennen.

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

5. VISUELLE ELEMENTE — setze mindestens 1-2 davon ein, wo der Inhalt es hergibt:
- ">> Begriff :: Erklärung" — wenn der Text Definitionen oder Fachbegriffe enthält (mehrere hintereinander, ersetzen Bullets im Abschnitt)
- "=> Schritt" — wenn der Text einen Ablauf oder Prozess beschreibt (min. 2, max. 6, ersetzen Bullets im Abschnitt)
- "!! Wert — Beschriftung" — für Jahreszahlen, Kennzahlen, Kernbegriffe im Text (max. 4 pro Abschnitt)
- "<> Links :: Rechts" — wenn der Text Vergleiche oder Pro/Contra enthält (mehrere hintereinander möglich)
- WICHTIG für "<>": Immer dann verwenden wenn zwei Dinge verglichen, gegenübergestellt oder mit "und/&/vs./oder" kombiniert werden. Beispiele:
    × FALSCH:  - Schriftliche Tests & Mündliche Tests
    ✓ RICHTIG: <> Schriftliche Tests :: Mündliche Tests
    × FALSCH:  - Vor- und Nachteile
    ✓ RICHTIG: <> Vorteile :: Nachteile
- "$Formel$" inline oder "$$Formel$$" als Block — wenn der Text mathematische Ausdrücke enthält
- "~~ Datum :: Ereignis" — wenn der Text chronologische Ereignisse oder einen Zeitstrahl enthält
- '"" Zitat — Autor" — wenn der Text wichtige Zitate oder Aussagen bekannter Personen enthält
- "@@ $Formel$ — Bezeichnung" — für die 1-3 zentralsten Formeln als hervorgehobene Formelbox
- Pro Abschnitt höchstens einen dieser Typen. Kein ### ohne nachfolgenden Inhalt.

6. OPTIONAL:
- Genau eine Zeile mit "**...**" als wichtiger Hinweis, wenn echten Mehrwert.
- Genau ein Merksatz am Ende im Format "> Merksatz: ...", nur wenn sinnvoll.
- Bei Vergleichen darf eine Tabelle verwendet werden: | Spalte 1 | Spalte 2 |

7. SICHERHEIT:
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

UNTERSTÜTZTE SYNTAX:
- "> Merksatz: ..." für einen prägnanten Kernsatz am Ende
- "> Quellenhinweis: ..." für Quellenangaben
- "| Spalte 1 | Spalte 2 |" für Vergleichstabellen

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
      temperature: 0.35,
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