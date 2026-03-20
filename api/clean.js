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
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: `Du bist ein präziser Textredakteur. Deine Aufgabe:
1. Entferne typische KI-Floskeln wie: "In der heutigen schnelllebigen Welt", "Zusammenfassend lässt sich sagen", "Es ist wichtig zu beachten dass", "Letztendlich", "Im Großen und Ganzen", etc.
2. Korrigiere Grammatik und Zeichensetzung
3. Entferne Füllwörter und unnötige Wiederholungen
4. Behalte den ursprünglichen Inhalt, Ton und Stil so nah wie möglich bei
5. Strukturiere Absätze sauber
6. Behalte vorhandene Überschriften (mit # oder ##) bei
Gib NUR den bereinigten Text zurück, KEINE Erklärungen, KEINE Kommentare.`
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
 
