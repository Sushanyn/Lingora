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

console.log("Stripe Webhook function started!")

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature")
  
  if (!signature) {
    return new Response('No signature provided', { status: 400 })
  }

  // Get the raw body for signature verification
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
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    // Retrieve the user ID we passed via the payment link URL
    const userId = session.client_reference_id
    const customerId = session.customer

    if (!userId) {
      console.error("No client_reference_id found in session. Cannot link to user.")
      return new Response("Ok, but unlinked", { status: 200 })
    }

    console.log(`Payment successful for user ${userId}. Upgrading to premium...`)

    // Update the profile in the database securely using the service role key
    const { error } = await supabase
      .from('profiles')
      .update({ 
        is_premium: true,
        stripe_customer_id: customerId 
      })
      .eq('id', userId)

    if (error) {
      console.error(`Error updating user profile in database: ${error.message}`)
      return new Response("Database error", { status: 500 })
    }
    
    console.log(`Successfully upgraded user ${userId} to PRO!`)
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
})
