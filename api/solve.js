export default async function handler(req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed.' });

  const { problem } = req.body;
  if (!problem) return res.status(400).json({ error: 'No engineering problem provided.' });

  // 2. The API Key Check
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
      return res.status(500).json({ error: 'Vercel Error: The GEMINI_API_KEY environment variable is missing.' });
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const systemPrompt = `You are a high-precision, automated engineering solver engine. Your goal is to provide direct, Photomath-style step-by-step solutions for Circuit Theory, Calculus, and Math problems.

  STRICT OPERATIONAL RULES:
  1. ZERO CHITCHAT: NEVER use greetings ("Greetings", "Hello"). NEVER use transitional filler ("Let's break this down", "Here is the solution").
  2. IMMEDIATE EXECUTION: Start your output directly with "### Step 1: [Action]". 
  3. CONCISE STEPS: Explain the "why" of a step in 1 brief sentence, then immediately show the math.
  4. THE FINAL ANSWER: Clearly label the final answer with "### Final Answer" at the bottom.
  5. SHORT SUMMARY: You may include a maximum 2-sentence summary of the principle used at the very end. NO concluding remarks or cheerleading.
  6. LATEX MANDATE: Use LaTeX for ALL math. Single $ for inline, double $$ for block equations.
  7. NO ASCII ART: Never draw diagrams using text characters.

  Problem to solve: ${problem}`;
  // 3. Execution & Error Catching
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
    });

    const data = await response.json();
    
    // IF GOOGLE REJECTS US
    if (!response.ok || !data.candidates) {
        return res.status(500).json({ error: `Google API Error: ${JSON.stringify(data)}` });
    }

    // IF SUCCESS
    const answer = data.candidates[0].content.parts[0].text;
    res.status(200).json({ solution: answer });

  } catch (error) {
    res.status(500).json({ error: `Fatal Bridge Error: ${error.message}` });
  }
}
