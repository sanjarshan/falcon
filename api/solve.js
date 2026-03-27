export default async function handler(req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed.' });

  // 2. Extract Text and Image from the Frontend
  const { problem, image } = req.body;
  
  // Validation: If both are missing, we can't solve anything
  if (!problem && !image) {
    return res.status(400).json({ error: 'No engineering problem or image provided.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro:generateContent?key=${apiKey}`;

  // 3. Construct the Multimodal Payload
  // We build a "parts" array. We always include the text prompt.
  const promptText = `You are a high-precision engineering solver. Solve the problem provided in the text or the attached image step-by-step. 
  Pay extreme attention to exponents and superscripts in images.
  1. ZERO CHITCHAT: NEVER use greetings ("Greetings", "Hello"). NEVER use transitional filler ("Let's break this down", "Here is the solution").
  2. IMMEDIATE EXECUTION: Start your output directly with "### Step 1: [Action]". 
  3. CONCISE STEPS: Explain the "why" of a step in 1 brief sentence, then immediately show the math.
  4. THE FINAL ANSWER: Clearly label the final answer with "### Final Answer" at the bottom.
  5. SHORT SUMMARY: You may include a maximum 2-sentence summary of the principle used at the very end. NO concluding remarks or cheerleading.
  6. LATEX MANDATE: Use LaTeX for ALL math. Single $ for inline, double $$ for block equations.
  7. NO ASCII ART: Never draw diagrams using text characters.
  User Text Input: ${problem || "Solve the problem shown in the image."}`;

  let requestParts = [{ text: promptText }];

  // If the user uploaded an image, we attach it to the request
  if (image) {
    requestParts.push({
      inline_data: {
        mime_type: "image/jpeg", // Works for png/jpg
        data: image
      }
    });
  }

  // 4. Fire the Request to Google
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: requestParts }]
      })
    });

    const data = await response.json();
    
    // Masking Rate Limits and Internal Errors
    if (!response.ok || !data.candidates) {
        if (response.status === 429) { // HTTP 429 is "Too Many Requests"
            return res.status(503).json({ error: "System is currently experiencing high traffic. Please try again in a few seconds." });
        }
        return res.status(500).json({ error: "Unable to process the calculation at this time. Please verify your input and try again." });
    }

    const answer = data.candidates[0].content.parts[0].text;
    res.status(200).json({ solution: answer });

  } catch (error) {
    // Masking fatal server crashes
    res.status(500).json({ error: "Connection to the solver core failed. Please check your network." });
  }
}
