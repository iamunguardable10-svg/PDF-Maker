export const config = { runtime: 'edge' };
 
export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
 
  const { text } = await req.json();
 
  if (!text || text.length > 10000) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });
  }
 
  const prompt = `Du bist ein Textformatierer für einen Lernzettel-Generator. Konvertiere den Input-Text in das unten beschriebene Markup-Format.
 
═══ AUSGABE-FORMAT ═══
 
# Haupttitel        → Titel des Dokuments (genau eine Zeile, kein Doppelpunkt)
## Untertitel       → z.B. Thema oder Seitenangabe (optional)
1. Abschnittsname   → nummerierte Abschnitts-Überschrift
- Bullet            → Aufzählungspunkt Ebene 1 (0 Leerzeichen)
  - Sub-Bullet      → Unterpunkt Ebene 2 (GENAU 2 Leerzeichen)
    - Sub-Sub       → Unterpunkt Ebene 3 (GENAU 4 Leerzeichen)
** Callout-Text **  → wichtiger Hinweis (muss mit ** beginnen UND enden)
> Merksatz: Text    → Zusammenfassung ganz am Ende (nur einmal)
 
═══ PFLICHTREGELN ═══
 
REGEL 1 — KEINE STERNCHEN IN BULLETS:
Bullet-Text darf NIEMALS **Sternchen** enthalten. Fett-Markierungen im Fließtext weglassen.
FALSCH: - **Sponsoring** ist wichtig
RICHTIG: - Sponsoring ist wichtig
 
REGEL 2 — VOLLSTÄNDIGKEIT:
Jeden einzelnen Punkt aus dem Original übernehmen. NICHTS weglassen, NICHTS kürzen.
Lieber mehr Bullets als weniger. Im Zweifel alles aufnehmen.
 
REGEL 3 — EINRÜCKUNG:
Ebene 1: "- Text" (kein Leerzeichen davor)
Ebene 2: "  - Text" (GENAU 2 Leerzeichen davor)
Ebene 3: "    - Text" (GENAU 4 Leerzeichen davor)
Tabs sind VERBOTEN — nur Leerzeichen verwenden.
 
REGEL 4 — LABELS (Wörter mit Doppelpunkt):
"Ziele:" oder "Vorteile:" → als normaler Bullet: "- Ziele:"
Die Unterpunkte darunter mit 2 Leerzeichen einrücken.
 
REGEL 5 — BEREINIGUNG:
- Entferne: KI-Floskeln, Trennlinien (---), Emojis am Zeilenanfang (🔵, ■ usw.)
- Behalte: alle inhaltlichen Informationen, Zahlen, Beispiele, Zitate
 
REGEL 6 — CALLOUT nur für wirklich wichtige Hinweise:
"** Text **" nur verwenden wenn im Original explizit etwas als besonders wichtig markiert ist (z.B. fett, unterstrichen, Ausrufezeichen). Nicht für normale Bullets.
 
REGEL 7 — KEIN EXTRA-TEXT:
Gib NUR den formatierten Text zurück.
KEINE Erklärungen, KEINE Kommentare, KEINE Markdown-Backticks (kein \`\`\`).
 
═══ BEISPIEL ═══
 
INPUT:
🔵 Folie 5 – Einnahmequellen
**Wichtige Geldquellen:**
* **Sponsoring** – Unternehmen zahlen für Werbung
* **Medienrechte** – TV-Sender zahlen für Übertragungen
* Ticketverkauf
Merke: Sport = Wirtschaftsfaktor!
 
OUTPUT:
# Einnahmequellen
## Folie 5
 
1. Wichtige Geldquellen
- Sponsoring – Unternehmen zahlen für Werbung
- Medienrechte – TV-Sender zahlen für Übertragungen
- Ticketverkauf
 
> Merksatz: Sport ist ein bedeutender Wirtschaftsfaktor
 
═══ DEIN INPUT ═══
 
${text}`;
 
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
  let cleaned = data.candidates?.[0]?.content?.parts?.[0]?.text ?? JSON.stringify(data);
 
  // Sicherheitsnetz im Backend: Sternchen in Bullet-Zeilen entfernen
  cleaned = cleaned
    .split('\n')
    .map(line => {
      // Nur in Bullet-Zeilen (- ...) Sternchen entfernen, aber ** Callout ** stehenlassen
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
