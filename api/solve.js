export default async function handler(req, res) {
  // 1. CORS Headers: This allows sumtying.com to talk to Vercel without getting blocked
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests from the browser
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Reject anything that isn't a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  // 3. Extract the problem from the frontend
  const { problem } = req.body;
  if (!problem) {
    return res.status(400).json({ error: 'No engineering problem provided.' });
  }

  // 4. The Architecture Setup
  const apiKey = process.env.GEMINI_API_KEY; // Hidden variable in Vercel
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // 5. THE SECRET SAUCE (System Prompt)
  // This forces the AI to act strictly as a high-level engineering tutor.
  const systemPrompt = `You are an expert university engineering professor specializing in Circuit Theory, Vector Analysis, and Microprocessors. 
  A student has provided a problem. Solve it step-by-step. 
  Format the output cleanly using plain text and standard math notation so it looks great on a dark mode web app. 
  Keep it structured. Put the final answer clearly at the bottom.
  
  Problem: ${problem}`;

  // 6. Execute the API Call
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }]
      })
    });

    const data = await response.json();
    
    // Extract the exact solution text
    const answer = data.candidates[0].content.parts[0].text;

    // Send it back to the student's screen
    res.status(200).json({ solution: answer });

  } catch (error) {
    console.error("API Bridge Error:", error);
    res.status(500).json({ error: 'Internal Server Error: The matrix collapsed.' });
  }
}