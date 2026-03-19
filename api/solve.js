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

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
  const systemPrompt = `You are an expert university engineering professor specializing in Circuit Theory, Vector Analysis, and Microprocessors. A student has provided a problem. Solve it step-by-step. Format the output cleanly using plain text and standard math notation. Problem: ${problem}`;

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
