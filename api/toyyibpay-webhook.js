export default async function handler(req, res) {
    // 1. CORS HEADERS (Allows us to test from the browser)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    console.log("Webhook triggered by ToyyibPay:", req.body);

    const { status_id, billExternalReferenceNo } = req.body;

    // 1 = Payment Successful
    if (status_id === '1') {
        const clientId = billExternalReferenceNo;
        
        // Using your exact frontend Supabase credentials for a guaranteed connection
        const supabaseUrl = 'https://wluutfmfreemswyvrpqz.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsdXV0Zm1mcmVlbXN3eXZycHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMDI4OTksImV4cCI6MjA4OTY3ODg5OX0.YRgMt7o0yIqxtTT-q4VtiFzpPyTcpU8T4ueB4OjyBTU';

        try {
            // 1. Check current credits
            const getRes = await fetch(`${supabaseUrl}/rest/v1/usage_tracker?client_id=eq.${clientId}&select=pro_credits`, {
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
            });
            const getData = await getRes.json();
            
            const currentCredits = (getData && getData.length > 0) ? getData[0].pro_credits : 0;
            const newCredits = currentCredits + 100;

            // 2. Add 100 Credits
            await fetch(`${supabaseUrl}/rest/v1/usage_tracker?client_id=eq.${clientId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ pro_credits: newCredits })
            });

            console.log(`Successfully added 100 credits to ${clientId}`);
        } catch (error) {
            console.error("Database Error:", error);
        }
    }

    // Always tell ToyyibPay we received the message so they stop pinging
    res.status(200).send('OK');
}
