const express = require('express');
const {
    authenticateEmailUser,
    createPublicAuthConfig,
    registerEmailUser,
    upsertOAuthUser,
} = require('../auth/authStore');
const {
    clearAuthSession,
    clearOAuthState,
    createOAuthState,
    getCurrentUserFromRequest,
    setAuthSession,
    setOAuthState,
    verifyOAuthState,
} = require('../auth/sessionTokens');

const router = express.Router();

function normalizeBaseUrl(value) {
    return String(value || '').trim().replace(/\/+$/, '');
}

function resolveFrontendPublicUrl(req) {
    return normalizeBaseUrl(process.env.FRONTEND_PUBLIC_URL) || `${req.protocol}://${req.get('host')}`;
}

function buildRedirectUrl(req, params) {
    const frontendBaseUrl = resolveFrontendPublicUrl(req);
    const url = new URL(frontendBaseUrl || 'http://localhost:3000');

    Object.entries(params || {}).forEach(([key, value]) => {
        if (value) {
            url.searchParams.set(key, value);
        }
    });

    return url.toString();
}

function ensureProviderEnabled(providerKey) {
    const config = createPublicAuthConfig('http://localhost/api/auth');
    return Boolean(config?.[providerKey]?.enabled);
}

function resolveBackendPublicUrl(req) {
    return normalizeBaseUrl(process.env.BACKEND_PUBLIC_URL) || `${req.protocol}://${req.get('host')}`;
}

function getGoogleCallbackUrl(req) {
    return process.env.GOOGLE_CALLBACK_URL || `${resolveBackendPublicUrl(req)}/api/auth/google/callback`;
}

function getGitHubCallbackUrl(req) {
    return process.env.GITHUB_CALLBACK_URL || `${resolveBackendPublicUrl(req)}/api/auth/github/callback`;
}

async function exchangeGoogleCode(req, code) {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            code,
            redirect_uri: getGoogleCallbackUrl(req),
            grant_type: 'authorization_code',
        }),
    });

    const tokenPayload = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenPayload.access_token) {
        throw new Error('Google no devolvió un token válido.');
    }

    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            Authorization: `Bearer ${tokenPayload.access_token}`,
        },
    });
    const profilePayload = await profileResponse.json();
    if (!profileResponse.ok || !profilePayload.email) {
        throw new Error('Google no devolvió un perfil con correo.');
    }

    return {
        email: profilePayload.email,
        name: profilePayload.name,
        providerId: profilePayload.id,
        username: profilePayload.email.split('@')[0],
    };
}

async function exchangeGitHubCode(req, code) {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'turbobujias-pro-auth',
        },
        body: new URLSearchParams({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: getGitHubCallbackUrl(req),
        }),
    });

    const tokenPayload = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenPayload.access_token) {
        throw new Error('GitHub no devolvió un token válido.');
    }

    const headers = {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${tokenPayload.access_token}`,
        'User-Agent': 'turbobujias-pro-auth',
    };
    const [userResponse, emailsResponse] = await Promise.all([
        fetch('https://api.github.com/user', { headers }),
        fetch('https://api.github.com/user/emails', { headers }),
    ]);
    const userPayload = await userResponse.json();
    const emailsPayload = await emailsResponse.json();
    const primaryEmail = Array.isArray(emailsPayload)
        ? emailsPayload.find((item) => item.primary && item.verified)?.email ||
        emailsPayload.find((item) => item.verified)?.email ||
        emailsPayload[0]?.email
        : '';

    if (!userResponse.ok || !emailsResponse.ok || !primaryEmail) {
        throw new Error('GitHub no devolvió un correo utilizable.');
    }

    return {
        email: primaryEmail,
        name: userPayload.name || userPayload.login,
        providerId: userPayload.id,
        username: userPayload.login,
        login: userPayload.login,
    };
}

router.get('/providers', (req, res) => {
    res.json(createPublicAuthConfig(`${req.protocol}://${req.get('host')}/api/auth`));
});

router.get('/me', (req, res) => {
    const currentUser = getCurrentUserFromRequest(req);
    if (!currentUser) {
        return res.json({ currentUser: null });
    }

    return res.json({ currentUser });
});

router.post('/register', (req, res) => {
    try {
        const user = registerEmailUser(req.body || {});
        setAuthSession(res, user);
        return res.status(201).json({ currentUser: user });
    } catch (error) {
        return res.status(400).json({ error: error.message || 'No se pudo registrar la cuenta.' });
    }
});

router.post('/login', (req, res) => {
    try {
        const user = authenticateEmailUser(req.body || {});
        setAuthSession(res, user);
        return res.json({ currentUser: user });
    } catch (error) {
        return res.status(401).json({ error: error.message || 'No se pudo iniciar sesión.' });
    }
});

router.post('/logout', (req, res) => {
    clearAuthSession(res);
    clearOAuthState(res);
    return res.json({ ok: true });
});

router.get('/google', (req, res) => {
    if (!ensureProviderEnabled('google')) {
        return res.redirect(buildRedirectUrl(req, { authError: 'google-no-configurado' }));
    }

    const state = createOAuthState('google');
    setOAuthState(res, state);

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', getGoogleCallbackUrl(req));
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'select_account');

    return res.redirect(authUrl.toString());
});

router.get('/google/callback', async (req, res) => {
    try {
        if (!verifyOAuthState(req, 'google', req.query.state)) {
            clearOAuthState(res);
            return res.redirect(buildRedirectUrl(req, { authError: 'google-state' }));
        }

        const profile = await exchangeGoogleCode(req, req.query.code);
        const user = upsertOAuthUser('google', profile);
        setAuthSession(res, user);
        clearOAuthState(res);
        return res.redirect(buildRedirectUrl(req, { auth: 'success' }));
    } catch (error) {
        clearOAuthState(res);
        if (error || !req.query.code) {
            return res.redirect(buildRedirectUrl(req, { authError: 'google-failed' }));
        }
        return res.redirect(buildRedirectUrl(req, { authError: 'google-failed' }));
    }
});

router.get('/github', (req, res) => {
    if (!ensureProviderEnabled('github')) {
        return res.redirect(buildRedirectUrl(req, { authError: 'github-no-configurado' }));
    }

    const state = createOAuthState('github');
    setOAuthState(res, state);

    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', getGitHubCallbackUrl(req));
    authUrl.searchParams.set('scope', 'user:email');
    authUrl.searchParams.set('state', state);

    return res.redirect(authUrl.toString());
});

router.get('/github/callback', async (req, res) => {
    try {
        if (!verifyOAuthState(req, 'github', req.query.state)) {
            clearOAuthState(res);
            return res.redirect(buildRedirectUrl(req, { authError: 'github-state' }));
        }

        const profile = await exchangeGitHubCode(req, req.query.code);
        const user = upsertOAuthUser('github', profile);
        setAuthSession(res, user);
        clearOAuthState(res);
        return res.redirect(buildRedirectUrl(req, { auth: 'success' }));
    } catch (error) {
        clearOAuthState(res);
        if (error || !req.query.code) {
            return res.redirect(buildRedirectUrl(req, { authError: 'github-failed' }));
        }
        return res.redirect(buildRedirectUrl(req, { authError: 'github-failed' }));
    }
});

module.exports = router;