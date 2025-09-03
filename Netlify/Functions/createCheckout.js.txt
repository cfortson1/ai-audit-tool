import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function handler(event) {
  try {
    const { name, email } = JSON.parse(event.body);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "AI Workflow Audit Report" },
            unit_amount: 4700, // $47 in cents
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.SITE_URL}/index.html#audit`,
cancel_url: `${process.env.SITE_URL}/index.html`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
