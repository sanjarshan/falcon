export default async function handler(req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST,GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GEMINI_API_KEY;

  try {
    // 2. Interrogate Google for the exact model list
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();

    if (!response.ok) {
        return res.status(500).json({ error: "Failed to fetch models", details: data });
    }

    // 3. Extract the names and send them to your frontend
    const modelNames = data.models.map(m => m.name);
    
    return res.status(200).json({ 
        message: "SYSTEM RADAR: Available Models", 
        models: modelNames 
    });

  } catch (error) {
    res.status(500).json({ error: "Server Crash." });
  }
}
