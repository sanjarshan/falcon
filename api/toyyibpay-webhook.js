export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    // CORS is intentionally absent. We only want ToyyibPay's servers talking to this pipe.
    
    const { status_id, billExternalReferenceNo } = req.body;

    // 1 = Payment Successful
    if (status_id === '1') {
        const clientId = billExternalReferenceNo;
        
        const supabaseUrl = '//findit';
        const supabaseKey = '//findit';

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

        } catch (error) {
            console.error("Database Error:", error);
        }
    }

    res.status(200).send('OK');
}
