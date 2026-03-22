import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    // ToyyibPay sends the receipt data here
    const { status_id, billExternalReferenceNo } = req.body;

    // status_id '1' means payment was successful
    if (status_id === '1') {
        const clientId = billExternalReferenceNo;

        try {
            // 1. Get the user's current credits
            const { data: user } = await supabase
                .from('usage_tracker')
                .select('pro_credits')
                .eq('client_id', clientId)
                .single();

            const currentCredits = user ? user.pro_credits : 0;

            // 2. Add 100 credits
            await supabase
                .from('usage_tracker')
                .upsert({ 
                    client_id: clientId, 
                    pro_credits: currentCredits + 100 
                });

            console.log(`Successfully credited 100 to ${clientId}`);
        } catch (error) {
            console.error('Database update failed:', error);
        }
    }

    // Always send OK so ToyyibPay knows we received the message
    res.status(200).send('OK');
}