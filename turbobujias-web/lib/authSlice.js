import { createSelector, createSlice } from "@reduxjs/toolkit";

const initialState = {
  currentUser: null,
  isHydrated: false,
};

const SUPER_ADMIN_IDENTITIES = [
  { username: "sjhallo07", email: "sjhallo07@turbobujiaspro.com" },
  { username: "marcos.mora", email: "marcos.mora@turbobujiaspro.com" },
];
const SUPER_ADMIN_EMAILS = new Set(SUPER_ADMIN_IDENTITIES.map((item) => item.email));
const SUPER_ADMIN_USERNAMES = new Set(SUPER_ADMIN_IDENTITIES.map((item) => item.username));

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function normalizeUsername(username) {
  return String(username || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "");
}

export function detectAdminIdentity({ email, username }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedEmail && !normalizedUsername) {
    return false;
  }

  return SUPER_ADMIN_EMAILS.has(normalizedEmail) || SUPER_ADMIN_USERNAMES.has(normalizedUsername);
}

function sanitizeStoredUser(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const email = normalizeEmail(user.email);
  const username = normalizeUsername(user.username || email.split("@")[0]);
  if (!email) {
    return null;
  }

  const isSuperAdmin = Boolean(user.isSuperAdmin ?? detectAdminIdentity({ email, username }));

  return {
    id: String(user.id || `user-${email}`),
    username,
    name: String(user.name || "Cliente Turbobujias").trim(),
    email,
    phone: String(user.phone || "").trim(),
    business: String(user.business || "").trim(),
    authProviders: Array.isArray(user.authProviders) ? user.authProviders : [],
    role: String(user.role || (isSuperAdmin ? "superadmin" : "client")).trim(),
    isAdmin: Boolean(user.isAdmin ?? isSuperAdmin),
    isSuperAdmin,
    createdAt: String(user.createdAt || new Date(0).toISOString()),
    updatedAt: String(user.updatedAt || user.createdAt || new Date(0).toISOString()),
  };
}

function sanitizeCurrentUser(user) {
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

function sanitizePayload(payload) {
  const currentUser = sanitizeCurrentUser(payload?.currentUser);

  return { currentUser };
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    hydrateAuthState(state, action) {
      const nextState = sanitizePayload(action.payload || {});
      state.currentUser = nextState.currentUser;
      state.isHydrated = true;
    },
    setCurrentUser(state, action) {
      state.currentUser = sanitizeCurrentUser(action.payload);
      state.isHydrated = true;
    },
    logout(state) {
      state.currentUser = null;
      state.isHydrated = true;
    },
  },
});

export const { hydrateAuthState, setCurrentUser, logout } = authSlice.actions;

export const selectAuthState = (state) => state.auth;
export const selectCurrentUser = createSelector([selectAuthState], (auth) => auth.currentUser);
export const selectIsAuthenticated = createSelector(
  [selectCurrentUser],
  (currentUser) => Boolean(currentUser)
);
export const selectIsAdmin = createSelector(
  [selectCurrentUser],
  (currentUser) => Boolean(currentUser?.isAdmin)
);
export const selectIsHydrated = createSelector([selectAuthState], (auth) => auth.isHydrated);
export const selectSuperAdminIdentities = () => SUPER_ADMIN_IDENTITIES;

export default authSlice.reducer;
