const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const USERS_FILE_PATH = path.join(__dirname, '..', 'data', 'users.json');
const PASSWORD_ITERATIONS = 210000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = 'sha256';
const DEFAULT_SUPERADMIN_PASSWORD =
    String(process.env.AUTH_SUPERADMIN_BOOTSTRAP_PASSWORD || '').trim() || 'TurboAdmin2026!';

const SUPERADMIN_SPECS = [
    {
        username: 'sjhallo07',
        name: 'sjhallo07',
        email: 'sjhallo07@turbobujiaspro.com',
    },
    {
        username: 'marcos.mora',
        name: 'Marcos Mora',
        email: 'marcos.mora@turbobujiaspro.com',
    },
];

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeUsername(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9._-]/g, '');
}

function toTitleCase(value) {
    return String(value || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

function parseCsvSet(value) {
    return new Set(
        String(value || '')
            .split(',')
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean)
    );
}

function buildSuperAdminEmails() {
    return new Set([
        ...SUPERADMIN_SPECS.map((user) => normalizeEmail(user.email)),
        ...parseCsvSet(process.env.AUTH_SUPERADMIN_EMAILS),
    ]);
}

function buildSuperAdminUsernames() {
    return new Set([
        ...SUPERADMIN_SPECS.map((user) => normalizeUsername(user.username)),
        ...parseCsvSet(process.env.AUTH_SUPERADMIN_USERNAMES),
    ]);
}

function isSuperAdminIdentity({ email, username }) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedUsername = normalizeUsername(username);

    return (
        buildSuperAdminEmails().has(normalizedEmail) ||
        buildSuperAdminUsernames().has(normalizedUsername)
    );
}

function hashPassword(password, salt) {
    return crypto
        .pbkdf2Sync(String(password || ''), salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST)
        .toString('hex');
}

function createPasswordRecord(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    return {
        passwordSalt: salt,
        passwordHash: hashPassword(password, salt),
    };
}

function verifyPassword(password, passwordHash, passwordSalt) {
    if (!passwordHash || !passwordSalt) {
        return false;
    }

    const candidateHash = hashPassword(password, passwordSalt);
    return crypto.timingSafeEqual(Buffer.from(candidateHash, 'hex'), Buffer.from(passwordHash, 'hex'));
}

function ensureDataDirectory() {
    fs.mkdirSync(path.dirname(USERS_FILE_PATH), { recursive: true });
}

function sanitizeStoredUser(user) {
    if (!user || typeof user !== 'object') {
        return null;
    }

    const email = normalizeEmail(user.email);
    const username = normalizeUsername(user.username || email.split('@')[0]);
    if (!email || !username) {
        return null;
    }

    const isSuperAdmin = Boolean(user.isSuperAdmin || isSuperAdminIdentity({ email, username }));
    const role = isSuperAdmin ? 'superadmin' : 'client';
    const authProviders = Array.isArray(user.authProviders)
        ? [...new Set(user.authProviders.map((provider) => String(provider || '').trim().toLowerCase()).filter(Boolean))]
        : [];

    if (user.passwordHash && !authProviders.includes('email')) {
        authProviders.unshift('email');
    }

    return {
        id: String(user.id || `user-${username}`),
        username,
        name: String(user.name || toTitleCase(username) || 'Cliente Turbobujias').trim(),
        email,
        phone: String(user.phone || '').trim(),
        business: String(user.business || '').trim(),
        passwordHash: String(user.passwordHash || '').trim(),
        passwordSalt: String(user.passwordSalt || '').trim(),
        authProviders,
        providerAccounts: typeof user.providerAccounts === 'object' && user.providerAccounts
            ? user.providerAccounts
            : {},
        role,
        isAdmin: role !== 'client',
        isSuperAdmin,
        createdAt: String(user.createdAt || new Date().toISOString()),
        updatedAt: String(user.updatedAt || new Date().toISOString()),
    };
}

function sanitizePublicUser(user) {
    const safeUser = sanitizeStoredUser(user);
    if (!safeUser) {
        return null;
    }

    return {
        id: safeUser.id,
        username: safeUser.username,
        name: safeUser.name,
        email: safeUser.email,
        phone: safeUser.phone,
        business: safeUser.business,
        authProviders: safeUser.authProviders,
        role: safeUser.role,
        isAdmin: safeUser.isAdmin,
        isSuperAdmin: safeUser.isSuperAdmin,
        createdAt: safeUser.createdAt,
        updatedAt: safeUser.updatedAt,
    };
}

function buildBootstrapUsers() {
    return SUPERADMIN_SPECS.map((user) => {
        const passwordRecord = createPasswordRecord(DEFAULT_SUPERADMIN_PASSWORD);
        return sanitizeStoredUser({
            id: `user-${user.username}`,
            ...user,
            ...passwordRecord,
            authProviders: ['email'],
            role: 'superadmin',
            isAdmin: true,
            isSuperAdmin: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
    }).filter(Boolean);
}

function readPersistedUsers() {
    try {
        if (!fs.existsSync(USERS_FILE_PATH)) {
            return [];
        }

        const raw = fs.readFileSync(USERS_FILE_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.map(sanitizeStoredUser).filter(Boolean);
    } catch (error) {
        console.warn('[auth] Failed to read users.json, using bootstrap users.', error);
        return [];
    }
}

function writeUsers(users) {
    ensureDataDirectory();
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2));
}

function loadUsers() {
    const persistedUsers = readPersistedUsers();
    const bootstrapUsers = buildBootstrapUsers();
    const merged = new Map();

    for (const user of persistedUsers) {
        merged.set(user.id, user);
    }

    for (const bootstrapUser of bootstrapUsers) {
        const existing = Array.from(merged.values()).find(
            (user) => user.email === bootstrapUser.email || user.username === bootstrapUser.username
        );
        const mergedUser = sanitizeStoredUser({
            ...(existing || {}),
            ...bootstrapUser,
            createdAt: existing?.createdAt || bootstrapUser.createdAt,
            updatedAt: new Date().toISOString(),
        });
        merged.set(mergedUser.id, mergedUser);
    }

    const normalizedUsers = Array.from(merged.values())
        .map(sanitizeStoredUser)
        .filter(Boolean)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    writeUsers(normalizedUsers);
    return normalizedUsers;
}

function saveUsers(users) {
    const normalizedUsers = users.map(sanitizeStoredUser).filter(Boolean);
    writeUsers(normalizedUsers);
    return normalizedUsers;
}

function createPublicAuthConfig(baseAuthUrl) {
    const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const githubEnabled = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

    return {
        emailPassword: {
            enabled: true,
            loginUrl: `${baseAuthUrl}/login`,
            registerUrl: `${baseAuthUrl}/register`,
        },
        google: {
            enabled: googleEnabled,
            authUrl: googleEnabled ? `${baseAuthUrl}/google` : '',
        },
        github: {
            enabled: githubEnabled,
            authUrl: githubEnabled ? `${baseAuthUrl}/github` : '',
        },
        superAdmins: SUPERADMIN_SPECS.map((user) => ({
            username: user.username,
            email: user.email,
            name: user.name,
        })),
    };
}

function findUserById(id) {
    return loadUsers().find((user) => user.id === String(id || '').trim()) || null;
}

function findUserByIdentifier(identifier) {
    const normalizedIdentifier = String(identifier || '').trim().toLowerCase();
    return (
        loadUsers().find(
            (user) => user.email === normalizedIdentifier || user.username === normalizeUsername(normalizedIdentifier)
        ) || null
    );
}

function registerEmailUser(payload) {
    const users = loadUsers();
    const email = normalizeEmail(payload?.email);
    const username = normalizeUsername(payload?.username || email.split('@')[0]);
    const name = String(payload?.name || '').trim();
    const password = String(payload?.password || '');

    if (!name || !email || !username || !password) {
        throw new Error('Completa nombre, usuario, correo y contraseña.');
    }

    if (password.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres.');
    }

    const duplicatedUser = users.find(
        (user) => user.email === email || user.username === username
    );
    if (duplicatedUser) {
        throw new Error('Ya existe una cuenta con ese correo o usuario.');
    }

    const passwordRecord = createPasswordRecord(password);
    const storedUser = sanitizeStoredUser({
        id: `user-${username}-${Date.now()}`,
        username,
        name,
        email,
        phone: payload?.phone,
        business: payload?.business,
        ...passwordRecord,
        authProviders: ['email'],
        role: isSuperAdminIdentity({ email, username }) ? 'superadmin' : 'client',
        isAdmin: isSuperAdminIdentity({ email, username }),
        isSuperAdmin: isSuperAdminIdentity({ email, username }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    saveUsers([storedUser, ...users]);
    return sanitizePublicUser(storedUser);
}

function authenticateEmailUser(payload) {
    const identifier = String(payload?.identifier || payload?.email || '').trim();
    const password = String(payload?.password || '');

    if (!identifier || !password) {
        throw new Error('Ingresa usuario o correo y contraseña.');
    }

    const matchedUser = findUserByIdentifier(identifier);
    if (!matchedUser?.passwordHash || !verifyPassword(password, matchedUser.passwordHash, matchedUser.passwordSalt)) {
        throw new Error('No encontramos una cuenta con esas credenciales.');
    }

    return sanitizePublicUser(matchedUser);
}

function upsertOAuthUser(provider, profile) {
    const normalizedProvider = String(provider || '').trim().toLowerCase();
    const email = normalizeEmail(profile?.email);
    const fallbackUsername = normalizeUsername(
        profile?.username || profile?.login || email.split('@')[0] || profile?.name
    );

    if (!email || !fallbackUsername) {
        throw new Error('El proveedor no devolvió un correo o usuario válido.');
    }

    const users = loadUsers();
    const existingUser = users.find(
        (user) => user.email === email || user.username === fallbackUsername
    );

    const nextUser = sanitizeStoredUser({
        ...(existingUser || {}),
        id: existingUser?.id || `user-${fallbackUsername}`,
        username: existingUser?.username || fallbackUsername,
        name: String(profile?.name || existingUser?.name || toTitleCase(fallbackUsername)).trim(),
        email,
        phone: existingUser?.phone || '',
        business: existingUser?.business || '',
        authProviders: [...new Set([...(existingUser?.authProviders || []), normalizedProvider])],
        providerAccounts: {
            ...(existingUser?.providerAccounts || {}),
            [normalizedProvider]: {
                id: String(profile?.providerId || profile?.id || '').trim(),
                username: String(profile?.username || profile?.login || '').trim(),
            },
        },
        role: isSuperAdminIdentity({ email, username: fallbackUsername }) ? 'superadmin' : 'client',
        isAdmin: isSuperAdminIdentity({ email, username: fallbackUsername }),
        isSuperAdmin: isSuperAdminIdentity({ email, username: fallbackUsername }),
        createdAt: existingUser?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    const otherUsers = users.filter((user) => user.id !== existingUser?.id);
    saveUsers([nextUser, ...otherUsers]);

    return sanitizePublicUser(nextUser);
}

module.exports = {
    SUPERADMIN_SPECS,
    authenticateEmailUser,
    createPublicAuthConfig,
    findUserById,
    findUserByIdentifier,
    loadUsers,
    normalizeEmail,
    normalizeUsername,
    registerEmailUser,
    sanitizePublicUser,
    upsertOAuthUser,
};