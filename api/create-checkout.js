export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const stripe = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY);
    const { items, deliveryFee, orderId, customerEmail } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'No items provided' });
    }

    const lineItems = items.map(item => ({
      price_data: {
        currency: 'gbp',
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.qty,
    }));

    if (deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'gbp',
          product_data: { name: 'Delivery fee' },
          unit_amount: Math.round(deliveryFee * 100),
        },
        quantity: 1,
      });
    }

    const origin = req.headers.origin || 'https://choma-uk.vercel.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customerEmail || undefined,
      success_url: `${origin}/?success=true&order=${orderId}`,
      cancel_url:  `${origin}/?cancelled=true`,
      metadata: { orderId },
    });

    return res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('Stripe error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}