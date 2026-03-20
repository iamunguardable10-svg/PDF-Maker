export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const text = req.body?.text;

  if (!text || typeof text !== 'string' || text.length > 10000) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  if (!process.env.GOOGLE_API_KEY) {
    return res.status(500).json({ error: 'GOOGLE_API_KEY fehlt' });
  }

  const isGenerate = text.startsWith('GENERIERE_LERNZETTEL: ');
  const topic = isGenerate ? text.replace('GENERIERE_LERNZETTEL: ', '').trim() : null;

  const prompt = isGenerate
    ? `Erstelle einen Lernzettel zu: "${topic}".
Format:
# Titel
## Lernzettel
1. Abschnitt
- Punkt
  - Unterpunkt
**Wichtiger Hinweis**
> Merksatz: Text`
    : `Konvertiere folgenden Text in Lernzettel-Format:

# Titel
## Untertitel
1. Abschnitt
- Bullet
  - Sub
**Wichtiger Hinweis**
> Merksatz: Text

Text:
${text}`;

  try {
    const response = await fetch(
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

    const data = await response.json();

    if (!response.ok) {
      return res.status(200).json({
        error: data?.error?.message || 'Gemini Fehler'
      });
    }

    let cleaned = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!cleaned) {
      return res.status(200).json({ error: 'Keine Antwort von Gemini' });
    }

    // Cleanup
    cleaned = cleaned
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, '  ')
      .replace(/^\*\*\s*(.*?)\s*\*\*$/gm, '**$1**')
      .trim();

    return res.status(200).json({ cleaned });

  } catch (err) {
    return res.status(200).json({ error: 'Serverfehler beim KI-Aufruf' });
  }
}
