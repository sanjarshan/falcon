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
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  // 3. Construct the Multimodal Payload
  // We build a "parts" array. We always include the text prompt.
  const promptText = `You are a high-precision engineering solver. Solve the problem provided in the text or the attached image step-by-step. 
  RULES: Use LaTeX for math ($ for inline, $$ for block). NO chitchat. Start with Step 1.
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
    
    if (!response.ok || !data.candidates) {
        return res.status(500).json({ error: `Google API Error: ${data.error?.message || 'Check your image size.'}` });
    }

    const answer = data.candidates[0].content.parts[0].text;
    res.status(200).json({ solution: answer });

  } catch (error) {
    res.status(500).json({ error: `Fatal Bridge Error: ${error.message}` });
  }
}
