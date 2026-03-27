export default async function handler(req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed.' });

  const { problem, image } = req.body;
  
  if (!problem && !image) {
    return res.status(400).json({ error: 'No engineering problem or image provided.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  
  // THE STABLE, HIGH-SPEED MULTIMODAL CORE
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const promptText = `You are a high-precision engineering solver. Solve the problem provided in the text or the attached image step-by-step. 
  Pay extreme attention to exponents and superscripts in images.
  1. ZERO CHITCHAT: NEVER use greetings. NEVER use transitional filler.
  2. IMMEDIATE EXECUTION: Start your output directly with "### Step 1: [Action]". 
  3. CONCISE STEPS: Explain the "why" of a step in 1 brief sentence, then immediately show the math.
  4. THE FINAL ANSWER: Clearly label the final answer with "### Final Answer" at the bottom.
  5. SHORT SUMMARY: You may include a maximum 2-sentence summary of the principle used at the very end.
  6. LATEX MANDATE: Use LaTeX for ALL math. Single $ for inline, double $$ for block equations.
  7. NO ASCII ART: Never draw diagrams using text characters.
  User Text Input: ${problem || "Solve the problem shown in the image."}`;

  let requestParts = [{ text: promptText }];

  if (image) {
    requestParts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: image
      }
    });
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: requestParts }]
      })
    });

    const data = await response.json();
    
    if (!response.ok || !data.candidates) {
        if (response.status === 429) { 
            return res.status(503).json({ error: "System is currently experiencing high traffic. Please try again in a few seconds." });
        }
        return res.status(500).json({ error: "Unable to process the calculation at this time. Please verify your input and try again." });
    }

    const answer = data.candidates[0].content.parts[0].text;
    res.status(200).json({ solution: answer });

  } catch (error) {
    res.status(500).json({ error: "Connection to the solver core failed. Please check your network." });
  }
}
