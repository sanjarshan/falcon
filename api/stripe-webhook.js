import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe and Supabase with secure Environment Variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY // We use the Service Role Key here so the server has God-mode access to the DB
);

// Vercel config to read the raw body (Required for Stripe security signatures)
export const config = {
    api: { bodyParser: false },
};

async function buffer(readable) {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // This line cryptographically proves the request actually came from Stripe, not a hacker
        event = stripe.webhooks.constructEvent(buf.toString(), sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // If the payment was successful...
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        
        // This is the magic variable we passed from your frontend!
        const clientId = session.client_reference_id; 

        if (clientId) {
            console.log(`✅ Payment received for client: ${clientId}`);

            try {
                // 1. Check how many pro_credits they currently have
                const { data, error: fetchError } = await supabase
                    .from('usage_tracker')
                    .select('pro_credits')
                    .eq('client_id', clientId)
                    .single();

                if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

                const currentCredits = data?.pro_credits || 0;

                // 2. Inject 100 new credits into their wallet
                const { error: updateError } = await supabase
                    .from('usage_tracker')
                    .upsert({ 
                        client_id: clientId, 
                        pro_credits: currentCredits + 100 
                    }, { onConflict: 'client_id' });

                if (updateError) throw updateError;
                
                console.log(`🚀 Successfully added 100 credits to ${clientId}`);
            } catch (dbError) {
                console.error('❌ Database update failed:', dbError);
                return res.status(500).json({ error: 'Database update failed' });
            }
        }
    }

    // Always return a 200 OK so Stripe knows we received the message
    res.status(200).json({ received: true });
}
