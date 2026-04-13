const express = require('express');
const axios = require('axios');

const router = express.Router();

function normalizeBaseUrl(value) {
    return String(value || '').trim().replace(/\/+$/, '');
}

function normalizePath(value, fallback) {
    const raw = String(value || fallback || '').trim();
    if (!raw) {
        return fallback || '/';
    }

    return raw.startsWith('/') ? raw : `/${raw}`;
}

function resolveBackendPublicUrl(req) {
    const configured = normalizeBaseUrl(process.env.BACKEND_PUBLIC_URL);
    if (configured) {
        return configured;
    }

    return `${req.protocol}://${req.get('host')}`;
}

function resolveFrontendRedirect(pathname) {
    const frontendPublicUrl = normalizeBaseUrl(process.env.FRONTEND_PUBLIC_URL);
    if (!frontendPublicUrl) {
        return '';
    }

    return `${frontendPublicUrl}${normalizePath(pathname, '/')}`;
}

router.get('/config', (req, res) => {
    const backendPublicUrl = resolveBackendPublicUrl(req);

    res.json({
        paypal: {
            enabled: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
            providerUrl: process.env.PAYPAL_URL || 'https://www.paypal.com/',
            ipnCallbackUrl: `${backendPublicUrl}/api/payments/paypal`,
            successRedirectUrl: resolveFrontendRedirect(
                process.env.PAYPAL_SUCCESS_PATH || '/?payment=paypal-success'
            ),
            cancelRedirectUrl: resolveFrontendRedirect(
                process.env.PAYPAL_CANCEL_PATH || '/?payment=paypal-cancel'
            ),
        },
        pagomovil: {
            enabled: true,
            callbackUrl: `${backendPublicUrl}/api/payments/pagomovil`,
            pendingRedirectUrl: resolveFrontendRedirect(
                process.env.PAGOMOVIL_PENDING_PATH || '/?payment=pagomovil-pending'
            ),
        },
    });
});

router.get('/paypal/success', (req, res) => {
    const redirectUrl = resolveFrontendRedirect(
        process.env.PAYPAL_SUCCESS_PATH || '/?payment=paypal-success'
    );

    if (!redirectUrl) {
        return res.json({ status: 'ok', payment: 'paypal', result: 'success' });
    }

    return res.redirect(302, redirectUrl);
});

router.get('/paypal/cancel', (req, res) => {
    const redirectUrl = resolveFrontendRedirect(
        process.env.PAYPAL_CANCEL_PATH || '/?payment=paypal-cancel'
    );

    if (!redirectUrl) {
        return res.json({ status: 'cancelled', payment: 'paypal' });
    }

    return res.redirect(302, redirectUrl);
});

// POST /api/payments/paypal — PayPal IPN webhook
router.post('/paypal', express.urlencoded({ extended: true }), async (req, res) => {
  const body = req.body;

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
      return res.sendStatus(200);
    }

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

    console.log('PayPal IPN verified for txn_id:', body.txn_id, {
      receiver: notifiedReceiver,
      amount: body.mc_gross,
      currency: body.mc_currency,
    });

    return res.sendStatus(200);
  } catch (err) {
    console.error('PayPal IPN error:', err.message);
    return res.sendStatus(500);
  }
});

// POST /api/payments/pagomovil — Pago Móvil receipt validation
router.post('/pagomovil', express.json(), (req, res) => {
  const { reference, phone, bank, amount_ves, order_id } = req.body;

  if (!reference || !phone || !bank || !amount_ves || !order_id) {
    return res.status(400).json({
      error: 'Missing fields: reference, phone, bank, amount_ves, order_id are required',
    });
  }

  console.log('Pago Móvil receipt received:', { reference, phone, bank, amount_ves, order_id });

    return res.json({
    status: 'pending_verification',
    message: 'Your Pago Móvil receipt has been received and will be verified shortly.',
    order_id,
      callback_url: `${resolveBackendPublicUrl(req)}/api/payments/pagomovil`,
      frontend_redirect_url: resolveFrontendRedirect(
          process.env.PAGOMOVIL_PENDING_PATH || '/?payment=pagomovil-pending'
      ),
  });
});

module.exports = router;
