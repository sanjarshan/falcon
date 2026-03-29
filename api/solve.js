export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed.' });

  // Now accepting 'messages' array instead of a single problem
  const { messages, image } = req.body;
  
  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'No telemetry provided.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const systemInstruction = `You are Falcon, a sovereign, high-precision engineering calculator. 
  1. STRICT CONTEXT: ONLY answer questions related to math, physics, coding, and engineering. If the user asks general questions or tries to chat, politely redirect them to engineering.
  2. ZERO CHITCHAT: No greetings. Start calculating immediately.
  3. CONCISE STEPS: Explain the "why" in 1 brief sentence, then show the math.
  4. LATEX MANDATE: Use LaTeX for ALL math. Single $ for inline, double $$ for block equations.`;

  // Build the conversation history payload
  let contents = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  // Append system instruction to the last user message
  const lastUserIndex = contents.map(c => c.role).lastIndexOf('user');
  if (lastUserIndex !== -1) {
      contents[lastUserIndex].parts[0].text = `[SYSTEM PROTOCOL: ${systemInstruction}]\n\nUser Query: ${contents[lastUserIndex].parts[0].text}`;
  }

  // Inject image into the latest message if it exists
  if (image && lastUserIndex !== -1) {
    contents[lastUserIndex].parts.push({
      inline_data: { mime_type: "image/jpeg", data: image }
    });
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
            temperature: 0.1, // TASK 5: HIGH PRECISION. Forces strict logic.
        }
      })
    });

    const data = await response.json();
    
    // TASK 4 & 6: GLOBAL COOLDOWN & EXHAUSTION HANDLING
    if (!response.ok || !data.candidates) {
        if (response.status === 429) { 
            return res.status(503).json({ error: "GLOBAL_COOLDOWN", message: "System is processing maximum capacity. Global cooldown initiated. Please wait 30 seconds." });
        }
        return res.status(500).json({ error: "Engine fault. Unable to process." });
    }

    const answer = data.candidates[0].content.parts[0].text;
    res.status(200).json({ solution: answer });

  } catch (error) {
    res.status(500).json({ error: "Connection to the solver core failed." });
  }
}
