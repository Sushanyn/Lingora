import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@11.16.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0"

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

// Initialize Supabase Client (Service Role for admin bypass)
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log("Stripe Lifecycle Webhook function started!")

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature")
  
  if (!signature) {
    return new Response('No signature provided', { status: 400 })
  }

  const body = await req.text()
  const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') as string

  let event;

  try {
    // Verify the webhook signature
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      endpointSecret,
      undefined,
      cryptoProvider
    )
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  try {
    // Check idempotency: Have we already processed this event?
    const { data: insertedEvent, error: insertError } = await supabase
      .from('processed_stripe_events')
      .insert({ event_id: event.id })
      .select()
      .single();

    if (insertError || !insertedEvent) {
      console.log(`Event ${event.id} already processed or DB error. Skipping.`);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Handle the full subscription lifecycle
    switch (event.type) {
      
      // 1. Initial Purchase
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.client_reference_id;
        const customerId = session.customer;

        if (userId && customerId) {
          console.log(`[Checkout Completed] Upgrading user ${userId}`);
          await supabase.from('profiles').update({ 
            is_premium: true,
            stripe_customer_id: customerId 
          }).eq('id', userId);
        } else {
          console.warn('[Checkout Completed] Missing userId or customerId');
        }
        break;
      }

      // 2. Renewal Success
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer;

        if (customerId) {
          console.log(`[Payment Succeeded] Ensuring premium for customer ${customerId}`);
          await supabase.from('profiles').update({ 
            is_premium: true 
          }).eq('stripe_customer_id', customerId);
        }
        break;
      }

      // 3. Payment Failed (Card Expired, Insufficient Funds)
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer;

        if (customerId) {
          console.log(`[Payment Failed] Downgrading customer ${customerId}`);
          await supabase.from('profiles').update({ 
            is_premium: false 
          }).eq('stripe_customer_id', customerId);
        }
        break;
      }

      // 4. Subscription Cancelled / Deleted
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;

        if (customerId) {
          console.log(`[Subscription Deleted] Downgrading customer ${customerId}`);
          await supabase.from('profiles').update({ 
            is_premium: false 
          }).eq('stripe_customer_id', customerId);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err: any) {
    console.error(`Error processing webhook event ${event.type}: ${err.message}`);
    return new Response("Webhook processing error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
})
