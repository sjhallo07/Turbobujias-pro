const express = require('express');
const axios = require('axios');

const router = express.Router();

// POST /api/payments/paypal  — PayPal IPN webhook
router.post('/paypal', express.urlencoded({ extended: true }), async (req, res) => {
  const body = req.body;

  // Verify with PayPal IPN endpoint
  try {
    const verification = await axios.post(
      'https://ipnpb.paypal.com/cgi-bin/webscr',
      `cmd=_notify-validate&${new URLSearchParams(body).toString()}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (verification.data !== 'VERIFIED') {
      console.warn('PayPal IPN not verified for txn_id:', body.txn_id);
      return res.sendStatus(400);
    }

    if (body.payment_status !== 'Completed') {
      // Not yet paid — acknowledge receipt without processing
      return res.sendStatus(200);
    }

    // Validate that the notification is for this merchant
    const receiverEmail = process.env.PAYPAL_RECEIVER_EMAIL;
    const notifiedReceiver = body.receiver_email || body.business || '';
    if (receiverEmail && notifiedReceiver.toLowerCase() !== receiverEmail.toLowerCase()) {
      console.warn(
        'PayPal IPN receiver mismatch — expected:',
        receiverEmail,
        'got:',
        notifiedReceiver
      );
      return res.sendStatus(400);
    }

    // TODO: cross-check mc_gross / mc_currency against the expected order total
    // before marking the order as paid (requires order lookup from database).
    console.log('PayPal IPN verified for txn_id:', body.txn_id, {
      receiver: notifiedReceiver,
      amount: body.mc_gross,
      currency: body.mc_currency,
    });

    // TODO: update order status in database
    return res.sendStatus(200);
  } catch (err) {
    console.error('PayPal IPN error:', err.message);
    return res.sendStatus(500);
  }
});

// POST /api/payments/pagomovil  — Pago Móvil receipt validation
router.post('/pagomovil', express.json(), (req, res) => {
  const { reference, phone, bank, amount_ves, order_id } = req.body;

  if (!reference || !phone || !bank || !amount_ves || !order_id) {
    return res.status(400).json({
      error: 'Missing fields: reference, phone, bank, amount_ves, order_id are required',
    });
  }

  // TODO: Integrate with bank API or manual verification queue
  console.log('Pago Móvil receipt received:', { reference, phone, bank, amount_ves, order_id });

  res.json({
    status: 'pending_verification',
    message: 'Your Pago Móvil receipt has been received and will be verified shortly.',
    order_id,
  });
});

module.exports = router;

// POST /api/payments/pagomovil  — Pago Móvil receipt validation
router.post('/pagomovil', express.json(), (req, res) => {
  const { reference, phone, bank, amount_ves, order_id } = req.body;

  if (!reference || !phone || !bank || !amount_ves || !order_id) {
    return res.status(400).json({
      error: 'Missing fields: reference, phone, bank, amount_ves, order_id are required',
    });
  }

  // TODO: Integrate with bank API or manual verification queue
  console.log('Pago Móvil receipt received:', { reference, phone, bank, amount_ves, order_id });

  res.json({
    status: 'pending_verification',
    message: 'Your Pago Móvil receipt has been received and will be verified shortly.',
    order_id,
  });
});

module.exports = router;
