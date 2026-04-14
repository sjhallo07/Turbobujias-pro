import { createSelector, createSlice } from "@reduxjs/toolkit";

const initialState = {
  currentUser: null,
  users: [],
  isHydrated: false,
};

const ADMIN_EMAILS = new Set([
  "admin@turbobujiaspro.com",
  "ventas@turbobujiaspro.com",
  "soporte@turbobujiaspro.com",
]);
const ADMIN_DOMAINS = new Set(["turbobujiaspro.com", "turbobujias.com"]);
const ADMIN_LOCAL_PART_PATTERN = /admin|ventas|manager|soporte/i;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function detectAdminFromEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return false;
  }

  if (ADMIN_EMAILS.has(normalizedEmail)) {
    return true;
  }

  const [localPart = "", domain = ""] = normalizedEmail.split("@");
  return Boolean(
    ADMIN_LOCAL_PART_PATTERN.test(localPart) ||
      (ADMIN_DOMAINS.has(domain) && ADMIN_LOCAL_PART_PATTERN.test(localPart))
  );
}

function sanitizeStoredUser(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const email = normalizeEmail(user.email);
  if (!email) {
    return null;
  }

  return {
    id: String(user.id || `user-${email}`),
    name: String(user.name || "Cliente Turbobujias").trim(),
    email,
    phone: String(user.phone || "").trim(),
    business: String(user.business || "").trim(),
    passwordHash: String(user.passwordHash || "").trim(),
    passwordSalt: String(user.passwordSalt || "").trim(),
    isAdmin: Boolean(user.isAdmin ?? detectAdminFromEmail(email)),
    createdAt: String(user.createdAt || new Date(0).toISOString()),
  };
}

function sanitizeCurrentUser(user) {
  const safeUser = sanitizeStoredUser(user);
  if (!safeUser) {
    return null;
  }

  return {
    id: safeUser.id,
    name: safeUser.name,
    email: safeUser.email,
    phone: safeUser.phone,
    business: safeUser.business,
    isAdmin: safeUser.isAdmin,
    createdAt: safeUser.createdAt,
  };
}

function sanitizePayload(payload) {
  const rawUsers = Array.isArray(payload?.users) ? payload.users : [];
  const users = rawUsers.map(sanitizeStoredUser).filter(Boolean);
  const currentUser = sanitizeCurrentUser(payload?.currentUser);

  return { currentUser, users };
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    hydrateAuthState(state, action) {
      const nextState = sanitizePayload(action.payload || {});
      state.currentUser = nextState.currentUser;
      state.users = nextState.users;
      state.isHydrated = true;
    },
    registerSuccess(state, action) {
      const registeredUser = sanitizeStoredUser(action.payload);
      if (!registeredUser) {
        return;
      }

      state.users = [
        registeredUser,
        ...state.users.filter((user) => user.email !== registeredUser.email),
      ];
      state.currentUser = sanitizeCurrentUser(registeredUser);
    },
    loginSuccess(state, action) {
      state.currentUser = sanitizeCurrentUser(action.payload);
    },
    logout(state) {
      state.currentUser = null;
    },
  },
});

export const { hydrateAuthState, registerSuccess, loginSuccess, logout } = authSlice.actions;

export const selectAuthState = (state) => state.auth;
export const selectAuthUsers = createSelector([selectAuthState], (auth) => auth.users);
export const selectCurrentUser = createSelector([selectAuthState], (auth) => auth.currentUser);
export const selectIsAuthenticated = createSelector(
  [selectCurrentUser],
  (currentUser) => Boolean(currentUser)
);
export const selectIsAdmin = createSelector(
  [selectCurrentUser],
  (currentUser) => Boolean(currentUser?.isAdmin)
);

export default authSlice.reducer;
