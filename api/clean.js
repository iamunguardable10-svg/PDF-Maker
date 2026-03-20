export const config = { runtime: 'edge' };
 
export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
 
  const { text } = await req.json();
 
  if (!text || text.length > 10000) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });
  }
 
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: `Du bist ein Textformatierer für einen Lernzettel-Generator. Deine Aufgabe ist es, beliebigen Input-Text in ein sauberes Markup-Format zu konvertieren UND dabei KI-Floskeln zu entfernen.
 
AUSGABE-FORMAT (strikt einhalten):
- "# Titel" → Haupttitel des Dokuments (genau eine Zeile)
- "## Untertitel" → Untertitel, z.B. Seitenangabe (optional, eine Zeile)
- "1. Abschnittsname" → nummerierte Abschnitt-Überschrift (farbige Section)
- "- Bullet" → normaler Aufzählungspunkt (Ebene 1)
- "  - Sub-Bullet" → Unterpunkt mit 2 Leerzeichen Einrückung (Ebene 2)
- "    - Sub-Sub" → Unterpunkt mit 4 Leerzeichen Einrückung (Ebene 3)
- "** Text **" → wichtiger Hinweis / Callout-Box (fett, farbig hinterlegt)
- "> Kurz-Merksatz: Text" → Zusammenfassung am Ende (nur einmal)
 
WICHTIGE REGELN:
1. Entferne KI-Floskeln: "In der heutigen schnelllebigen Welt", "Zusammenfassend lässt sich sagen", "Es ist wichtig zu beachten", "Letztendlich", "Im Großen und Ganzen" usw.
2. Erkenne Struktur automatisch: Überschriften → "1. Abschnitt", Aufzählungen mit *, -, •, Zahlen → "- Bullet"
3. Einrückungen beibehalten: Was im Original eingerückt ist, bleibt eingerückt
4. Labels (Wörter die mit ":" enden wie "Ziele:", "Vorteile:") als eigene Bullet-Zeile mit "- Label:" belassen
5. Trennlinien (---, ===) entfernen
6. Emojis und Sonderzeichen am Zeilenanfang (wie 🔵) entfernen
7. Inhalt NICHT kürzen oder zusammenfassen — alles übernehmen
8. Gib NUR den formatierten Text zurück, KEINE Erklärungen, KEINE Kommentare, KEINE Backticks
 
BEISPIEL INPUT:
🔵 Folie 11 – Sport und Medien
**Inhalt:**
* TV, Streaming
* Einnahmen durch:
  * Übertragungsrechte
 
BEISPIEL OUTPUT:
# Sport und Medien
## Folie 11
 
1. Inhalt
- TV, Streaming
- Einnahmen durch:
  - Übertragungsrechte`
        },
        { role: 'user', content: text }
      ],
    }),
  });
 
  const data = await response.json();
  const cleaned = data.choices?.[0]?.message?.content ?? '';
 
  return new Response(JSON.stringify({ cleaned }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
 
