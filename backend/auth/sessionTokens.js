const crypto = require('node:crypto');
const { findUserById, sanitizePublicUser } = require('./authStore');

const SESSION_COOKIE_NAME = 'tb_session';
const OAUTH_STATE_COOKIE_NAME = 'tb_oauth_state';

function getSecret() {
    return String(process.env.AUTH_SESSION_SECRET || 'turbobujias-dev-session-secret');
}

function encodeBase64Url(value) {
    return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value) {
    return Buffer.from(String(value || ''), 'base64url').toString('utf8');
}

function signPayload(payload) {
    return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

function createSignedToken(data) {
    const payload = encodeBase64Url(JSON.stringify(data));
    const signature = signPayload(payload);
    return `${payload}.${signature}`;
}

function verifySignedToken(token) {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) {
        return null;
    }

    const expectedSignature = signPayload(payload);
    if (signature.length !== expectedSignature.length) {
        return null;
    }
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return null;
    }

    try {
        const parsed = JSON.parse(decodeBase64Url(payload));
        if (parsed?.exp && Number(parsed.exp) < Date.now()) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

function parseCookies(cookieHeader) {
    return String(cookieHeader || '')
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean)
        .reduce((cookies, chunk) => {
            const separatorIndex = chunk.indexOf('=');
            if (separatorIndex <= 0) {
                return cookies;
            }

            const name = chunk.slice(0, separatorIndex).trim();
            const value = chunk.slice(separatorIndex + 1).trim();
            cookies[name] = decodeURIComponent(value);
            return cookies;
        }, {});
}

function appendCookieHeader(res, cookieValue) {
    const current = res.getHeader('Set-Cookie');
    if (!current) {
        res.setHeader('Set-Cookie', [cookieValue]);
        return;
    }

    const next = Array.isArray(current) ? [...current, cookieValue] : [current, cookieValue];
    res.setHeader('Set-Cookie', next);
}

function serializeCookie(name, value, options = {}) {
    const parts = [`${name}=${encodeURIComponent(value)}`];
    parts.push(`Path=${options.path || '/'}`);
    if (typeof options.maxAge === 'number') {
        parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
    }
    if (options.httpOnly !== false) {
        parts.push('HttpOnly');
    }
    if (options.sameSite) {
        parts.push(`SameSite=${options.sameSite}`);
    }
    if (options.secure) {
        parts.push('Secure');
    }

    return parts.join('; ');
}

function setAuthSession(res, user) {
    const token = createSignedToken({
        userId: user.id,
        exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });

    appendCookieHeader(
        res,
        serializeCookie(SESSION_COOKIE_NAME, token, {
            httpOnly: true,
            sameSite: 'Lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
        })
    );
}

function clearAuthSession(res) {
    appendCookieHeader(
        res,
        serializeCookie(SESSION_COOKIE_NAME, '', {
            httpOnly: true,
            sameSite: 'Lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 0,
        })
    );
}

function getCurrentUserFromRequest(req) {
    const cookies = parseCookies(req.headers.cookie);
    const payload = verifySignedToken(cookies[SESSION_COOKIE_NAME]);
    if (!payload?.userId) {
        return null;
    }

    return sanitizePublicUser(findUserById(payload.userId));
}

function createOAuthState(provider) {
    return createSignedToken({
        provider,
        nonce: crypto.randomBytes(12).toString('hex'),
        exp: Date.now() + 1000 * 60 * 10,
    });
}

function setOAuthState(res, state) {
    appendCookieHeader(
        res,
        serializeCookie(OAUTH_STATE_COOKIE_NAME, state, {
            httpOnly: true,
            sameSite: 'Lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 10,
        })
    );
}

function clearOAuthState(res) {
    appendCookieHeader(
        res,
        serializeCookie(OAUTH_STATE_COOKIE_NAME, '', {
            httpOnly: true,
            sameSite: 'Lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 0,
        })
    );
}

function verifyOAuthState(req, provider, incomingState) {
    const cookies = parseCookies(req.headers.cookie);
    const storedState = verifySignedToken(cookies[OAUTH_STATE_COOKIE_NAME]);
    const queryState = verifySignedToken(incomingState);

    return Boolean(
        storedState &&
        queryState &&
        storedState.nonce === queryState.nonce &&
        storedState.provider === provider &&
        queryState.provider === provider
    );
}

module.exports = {
    clearAuthSession,
    clearOAuthState,
    createOAuthState,
    getCurrentUserFromRequest,
    setAuthSession,
    setOAuthState,
    verifyOAuthState,
};