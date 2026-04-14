"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  detectAdminFromEmail,
  hydrateAuthState,
  loginSuccess,
  registerSuccess,
  selectAuthState,
  selectAuthUsers,
} from "../lib/authSlice";

const AUTH_STORAGE_KEY = "tb-auth-state";

function sanitizePersistedPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { currentUser: null, users: [] };
  }

  return {
    currentUser: payload.currentUser ?? null,
    users: Array.isArray(payload.users) ? payload.users : [],
  };
}

async function hashPassword(password) {
  const saltBuffer = window.crypto.getRandomValues(new Uint8Array(16));
  const normalizedPassword = String(password || "");
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(normalizedPassword),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const buffer = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBuffer,
      iterations: 120000,
    },
    keyMaterial,
    256
  );

  return {
    passwordHash: Array.from(new Uint8Array(buffer), (value) =>
      value.toString(16).padStart(2, "0")
    ).join(""),
    passwordSalt: Array.from(saltBuffer, (value) => value.toString(16).padStart(2, "0")).join(""),
  };
}

async function hashPasswordWithSalt(password, passwordSalt) {
  const normalizedPassword = String(password || "");
  const saltHex = String(passwordSalt || "");
  const saltBuffer = Uint8Array.from(
    saltHex.match(/.{1,2}/g)?.map((chunk) => parseInt(chunk, 16)) || []
  );
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(normalizedPassword),
    "PBKDF2",
      false,
      ["deriveBits"]
  );
  const buffer = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBuffer,
      iterations: 120000,
    },
    keyMaterial,
    256
  );

  return Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, "0")).join("");
}

function createStoredUser(values, passwordHash, passwordSalt) {
  const email = String(values.email || "").trim().toLowerCase();

  return {
    id: `user-${email}-${Date.now()}`,
    name: String(values.name || "Cliente Turbobujias").trim(),
    email,
    phone: String(values.phone || "").trim(),
    business: String(values.business || "").trim(),
    passwordHash,
    passwordSalt,
    isAdmin: detectAdminFromEmail(email),
    createdAt: new Date().toISOString(),
  };
}

export default function AuthModal({ isOpen, mode, onClose, onModeChange }) {
  const dispatch = useDispatch();
  const authState = useSelector(selectAuthState);
  const users = useSelector(selectAuthUsers);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    phone: "",
    business: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (typeof window === "undefined" || hasLoadedStorage) {
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (rawValue) {
        dispatch(hydrateAuthState(sanitizePersistedPayload(JSON.parse(rawValue))));
      } else {
        dispatch(hydrateAuthState({ currentUser: null, users: [] }));
      }
    } catch (storageError) {
      console.warn("No se pudo leer tb-auth-state desde localStorage.", storageError);
      dispatch(hydrateAuthState({ currentUser: null, users: [] }));
    } finally {
      setHasLoadedStorage(true);
    }
  }, [dispatch, hasLoadedStorage]);

  useEffect(() => {
    if (typeof window === "undefined" || !authState.isHydrated || !hasLoadedStorage) {
      return;
    }

    try {
      window.localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ currentUser: authState.currentUser, users: authState.users })
      );
    } catch (storageError) {
      console.warn("No se pudo guardar tb-auth-state en localStorage.", storageError);
    }
  }, [authState.currentUser, authState.isHydrated, authState.users, hasLoadedStorage]);

  useEffect(() => {
    if (!isOpen) {
      setError("");
      setStatus("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const adminHint = useMemo(() => {
    const email = mode === "register" ? registerForm.email : loginForm.email;
    return detectAdminFromEmail(email)
      ? "Se detectará como cuenta administradora."
      : "Se iniciará como cuenta cliente.";
  }, [loginForm.email, mode, registerForm.email]);

  if (!isOpen) {
    return null;
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setStatus("");

    try {
      const trimmedEmail = registerForm.email.trim().toLowerCase();
      if (!registerForm.name.trim() || !trimmedEmail || !registerForm.password) {
        throw new Error("Completa nombre, correo y contraseña para crear tu cuenta.");
      }
      if (registerForm.password.length < 8) {
        throw new Error("La contraseña debe tener al menos 8 caracteres.");
      }
      if (registerForm.password !== registerForm.confirmPassword) {
        throw new Error("La confirmación de contraseña no coincide.");
      }
      if (users.some((user) => user.email === trimmedEmail)) {
        throw new Error("Ya existe una cuenta registrada con ese correo.");
      }

      const { passwordHash, passwordSalt } = await hashPassword(registerForm.password);
      const storedUser = createStoredUser(
        { ...registerForm, email: trimmedEmail },
        passwordHash,
        passwordSalt
      );
      dispatch(registerSuccess(storedUser));
      setStatus(
        storedUser.isAdmin
          ? "Cuenta creada con permisos administradores."
          : "Cuenta creada correctamente."
      );
      setRegisterForm({
        name: "",
        email: "",
        phone: "",
        business: "",
        password: "",
        confirmPassword: "",
      });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo registrar la cuenta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setStatus("");

    try {
      const trimmedEmail = loginForm.email.trim().toLowerCase();
      if (!trimmedEmail || !loginForm.password) {
        throw new Error("Ingresa correo y contraseña.");
      }

      const matchedUser = users.find((user) => user.email === trimmedEmail);

      if (!matchedUser) {
        throw new Error("No encontramos una cuenta con esas credenciales.");
      }

      const passwordHash = await hashPasswordWithSalt(loginForm.password, matchedUser.passwordSalt);
      if (matchedUser.passwordHash !== passwordHash) {
        throw new Error("No encontramos una cuenta con esas credenciales.");
      }

      dispatch(loginSuccess(matchedUser));
      setStatus(matchedUser.isAdmin ? "Sesión administradora iniciada." : "Sesión iniciada.");
      setLoginForm({ email: "", password: "" });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo iniciar sesión.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        aria-labelledby="auth-modal-title"
        aria-modal="true"
        className="modal-card"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="tag">Acceso</span>
            <h2 id="auth-modal-title">{mode === "register" ? "Crear cuenta" : "Iniciar sesión"}</h2>
            <p className="muted">
              Guarda tus datos para cotizaciones rápidas y detecta perfiles administradores por correo.
            </p>
          </div>
          <button aria-label="Cerrar autenticación" className="icon-button" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="auth-switcher">
          <button
            className={`button-chip ${mode === "login" ? "active" : ""}`}
            onClick={() => onModeChange("login")}
            type="button"
          >
            Login
          </button>
          <button
            className={`button-chip ${mode === "register" ? "active" : ""}`}
            onClick={() => onModeChange("register")}
            type="button"
          >
            Registro
          </button>
        </div>

        {mode === "register" ? (
          <form className="auth-form-grid" onSubmit={handleRegisterSubmit}>
            <label className="field-group" htmlFor="register-name">
              <span>Nombre</span>
              <input
                id="register-name"
                onChange={(event) => setRegisterForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Nombre del cliente o taller"
                value={registerForm.name}
              />
            </label>
            <label className="field-group" htmlFor="register-email">
              <span>Correo</span>
              <input
                id="register-email"
                onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="ventas@turbobujiaspro.com"
                type="email"
                value={registerForm.email}
              />
            </label>
            <label className="field-group" htmlFor="register-phone">
              <span>Teléfono</span>
              <input
                id="register-phone"
                onChange={(event) => setRegisterForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="0414-0000000"
                value={registerForm.phone}
              />
            </label>
            <label className="field-group" htmlFor="register-business">
              <span>Taller / empresa</span>
              <input
                id="register-business"
                onChange={(event) => setRegisterForm((current) => ({ ...current, business: event.target.value }))}
                placeholder="Taller El Pistón"
                value={registerForm.business}
              />
            </label>
            <label className="field-group" htmlFor="register-password">
              <span>Contraseña</span>
              <input
                id="register-password"
                onChange={(event) =>
                  setRegisterForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="Mínimo 8 caracteres"
                type="password"
                value={registerForm.password}
              />
            </label>
            <label className="field-group" htmlFor="register-confirm-password">
              <span>Confirmar contraseña</span>
              <input
                id="register-confirm-password"
                onChange={(event) =>
                  setRegisterForm((current) => ({ ...current, confirmPassword: event.target.value }))
                }
                placeholder="Repite la contraseña"
                type="password"
                value={registerForm.confirmPassword}
              />
            </label>
            <p className="form-hint">{adminHint}</p>
            {error ? <p className="form-error">{error}</p> : null}
            {status ? <p className="form-success">{status}</p> : null}
            <div className="actions-row">
              <button className="button-primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Guardando…" : "Crear cuenta"}
              </button>
              <button className="button-secondary" onClick={() => onModeChange("login")} type="button">
                Ya tengo cuenta
              </button>
            </div>
          </form>
        ) : (
          <form className="auth-form-grid" onSubmit={handleLoginSubmit}>
            <label className="field-group" htmlFor="login-email">
              <span>Correo</span>
              <input
                id="login-email"
                onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="cliente@correo.com"
                type="email"
                value={loginForm.email}
              />
            </label>
            <label className="field-group" htmlFor="login-password">
              <span>Contraseña</span>
              <input
                id="login-password"
                onChange={(event) =>
                  setLoginForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="Ingresa tu contraseña"
                type="password"
                value={loginForm.password}
              />
            </label>
            <p className="form-hint">{adminHint}</p>
            {error ? <p className="form-error">{error}</p> : null}
            {status ? <p className="form-success">{status}</p> : null}
            <div className="actions-row">
              <button className="button-primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Entrando…" : "Entrar"}
              </button>
              <button className="button-secondary" onClick={() => onModeChange("register")} type="button">
                Crear cuenta
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
