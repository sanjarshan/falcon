import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// 1. Initialize the Secure Connections using the Vercel Vault
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// We need the "raw" data body to verify Stripe's cryptographic signature
export const config = {
  api: {
    bodyParser: false,
  },
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
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  // 2. VERIFY THE HANDSHAKE (Ensure it's actually Stripe, not a hacker)
  try {
    event = stripe.webhooks.constructEvent(buf.toString(), sig, webhookSecret);
  } catch (err) {
    console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 3. EXECUTE THE TOP-UP
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const clientId = session.client_reference_id; // The Google User ID we attached in HTML

    if (clientId) {
      console.log(`💰 Payment received for user: ${clientId}. Initiating top-up...`);

      // A. Check their current balance
      const { data: userData } = await supabase
        .from('usage_tracker')
        .select('pro_credits')
        .eq('client_id', clientId)
        .single();

      const currentCredits = userData ? (userData.pro_credits || 0) : 0;
      const newBalance = currentCredits + 100;

      // B. Update the database securely
      const { error: updateError } = await supabase
        .from('usage_tracker')
        .upsert(
          { client_id: clientId, pro_credits: newBalance },
          { onConflict: 'client_id' }
        );

      if (updateError) {
        console.error("❌ Error updating Supabase:", updateError);
        return res.status(500).json({ error: 'Database update failed' });
      }

      console.log(`✅ Successfully added 100 credits to ${clientId}. New Balance: ${newBalance}`);
    }
  }

  // Tell Stripe we received it successfully
  res.status(200).json({ received: true });
}