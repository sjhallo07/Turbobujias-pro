const express = require('express');
const { createPublicAuthConfig } = require('../auth/authStore');

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

function resolveFrontendPublicUrl(req) {
    const configured = normalizeBaseUrl(process.env.FRONTEND_PUBLIC_URL);
    if (configured) {
        return configured;
    }

    return `${req.protocol}://${req.get('host')}`;
}

function resolveChatbotPublicUrl(req) {
    const configured = String(process.env.CHATBOT_PUBLIC_URL || '').trim();
    if (!configured) {
        return 'https://sjhallo07-turbobujias-ai.hf.space';
    }

    if (/^https?:\/\//i.test(configured)) {
        return normalizeBaseUrl(configured);
    }

    return `${resolveBackendPublicUrl(req)}${normalizePath(configured, '/chatbot')}`;
}

function resolveChatbotApiBaseUrl(req) {
    const configuredApi = String(process.env.CHATBOT_API_BASE_URL || '').trim();
    if (configuredApi) {
        if (/^https?:\/\//i.test(configuredApi)) {
            return normalizeBaseUrl(configuredApi);
        }

        return `${resolveBackendPublicUrl(req)}${normalizePath(configuredApi, '/')}`;
    }

    const configuredUi = String(process.env.CHATBOT_PUBLIC_URL || '').trim();
    if (!configuredUi) {
        return 'https://sjhallo07-turbobujias-ai.hf.space';
    }

    if (/^https?:\/\//i.test(configuredUi)) {
        const normalizedUi = normalizeBaseUrl(configuredUi);
        if (normalizedUi.endsWith('/chatbot')) {
            return normalizedUi.slice(0, -'/chatbot'.length) || normalizedUi;
        }
        return normalizedUi;
    }

    return resolveBackendPublicUrl(req);
}

function resolveDatasetViewerBaseUrl() {
    return normalizeBaseUrl(process.env.DATASET_VIEWER_BASE_URL) || 'https://datasets-server.huggingface.co';
}

function buildFrontendRedirect(req, pathname) {
    const frontendBaseUrl = resolveFrontendPublicUrl(req);
    if (!frontendBaseUrl) {
        return '';
    }

    return `${frontendBaseUrl}${normalizePath(pathname, '/')}`;
}

router.get('/public', (req, res) => {
    const backendPublicUrl = resolveBackendPublicUrl(req);
    const frontendPublicUrl = resolveFrontendPublicUrl(req);
    const chatbotPublicUrl = resolveChatbotPublicUrl(req);
    const chatbotApiBaseUrl = resolveChatbotApiBaseUrl(req);
    const authBaseUrl = `${backendPublicUrl}/api/auth`;

    res.json({
        backend: {
            publicUrl: backendPublicUrl,
            apiBaseUrl: `${backendPublicUrl}/api`,
            healthUrl: `${backendPublicUrl}/api/health`,
            inventoryRatesUrl: `${backendPublicUrl}/api/inventory/rates`,
        },
        frontend: {
            publicUrl: frontendPublicUrl,
        },
        auth: createPublicAuthConfig(authBaseUrl),
        chatbot: {
            publicUrl: chatbotPublicUrl,
            requestUrl: `${chatbotApiBaseUrl}/chat`,
            metadataUrl: `${chatbotApiBaseUrl}/openapi.json`,
        },
        datasetViewer: {
            publicUrl: `${backendPublicUrl}/api/dataset-viewer`,
            healthUrl: `${backendPublicUrl}/api/dataset-viewer/healthcheck`,
            splitsUrl: `${backendPublicUrl}/api/dataset-viewer/splits`,
            firstRowsUrl: `${backendPublicUrl}/api/dataset-viewer/first-rows`,
            upstreamBaseUrl: resolveDatasetViewerBaseUrl(),
        },
        links: {
            whatsappUrl: process.env.WHATSAPP_URL || 'https://api.whatsapp.com/send',
            instagramUrl:
                process.env.INSTAGRAM_URL || 'https://www.instagram.com/turbobujiaspro/',
            mercadoLibreUrl:
                process.env.MERCADOLIBRE_URL || 'https://www.mercadolibre.com.ve/',
            paypalUrl: process.env.PAYPAL_URL || 'https://www.paypal.com/',
            binancePayUrl: process.env.BINANCE_PAY_URL || 'https://pay.binance.com/',
        },
        payments: {
            paypal: {
                enabled: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
                providerUrl: process.env.PAYPAL_URL || 'https://www.paypal.com/',
                ipnCallbackUrl: `${backendPublicUrl}/api/payments/paypal`,
                successRedirectUrl: buildFrontendRedirect(
                    req,
                    process.env.PAYPAL_SUCCESS_PATH || '/?payment=paypal-success'
                ),
                cancelRedirectUrl: buildFrontendRedirect(
                    req,
                    process.env.PAYPAL_CANCEL_PATH || '/?payment=paypal-cancel'
                ),
            },
            pagomovil: {
                enabled: true,
                callbackUrl: `${backendPublicUrl}/api/payments/pagomovil`,
                pendingRedirectUrl: buildFrontendRedirect(
                    req,
                    process.env.PAGOMOVIL_PENDING_PATH || '/?payment=pagomovil-pending'
                ),
            },
            mercadopago: {
                enabled: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN),
            },
        },
        pricing: {
            baseCurrency: 'USD',
            supportedCurrencies: ['USD', 'EUR', 'VES'],
            updateCadence: 'daily',
        },
    });
});

module.exports = router;
