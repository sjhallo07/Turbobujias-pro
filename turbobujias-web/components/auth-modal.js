"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import {
  detectAdminIdentity,
  normalizeUsername,
  setCurrentUser,
} from "../lib/authSlice";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

async function postJson(pathname, payload) {
  const response = await fetch(`${API_URL}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload || {}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "La solicitud de autenticación falló.");
  }

  return data;
}

export default function AuthModal({ authConfig, isOpen, mode, onClose, onModeChange }) {
  const dispatch = useDispatch();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    business: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!isOpen) {
      setError("");
      setStatus("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const adminHint = useMemo(() => {
    const identity = mode === "register"
      ? { email: registerForm.email, username: registerForm.username }
      : { email: loginForm.identifier, username: loginForm.identifier };

    return detectAdminIdentity(identity)
      ? "Se detectará como superadmin."
      : "Se iniciará como cuenta cliente.";
  }, [loginForm.identifier, mode, registerForm.email, registerForm.username]);

  const googleEnabled = Boolean(authConfig?.google?.enabled);
  const githubEnabled = Boolean(authConfig?.github?.enabled);

  function startProviderFlow(provider) {
    const providerUrl = authConfig?.[provider]?.authUrl;
    if (!providerUrl) {
      setError(`El acceso con ${provider} aún no está configurado en el servidor.`);
      return;
    }

    const popup = window.open(
      providerUrl,
      `tb-auth-${provider}`,
      "popup=yes,width=720,height=760,noopener,noreferrer"
    );

    if (popup) {
      popup.focus();
      setStatus(`Abriendo ${provider} en una ventana secundaria segura…`);
      return;
    }

    window.location.assign(providerUrl);
  }

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
      const trimmedUsername = normalizeUsername(registerForm.username || trimmedEmail.split("@")[0]);
      if (!registerForm.name.trim() || !trimmedUsername || !trimmedEmail || !registerForm.password) {
        throw new Error("Completa nombre, usuario, correo y contraseña para crear tu cuenta.");
      }
      if (registerForm.password.length < 8) {
        throw new Error("La contraseña debe tener al menos 8 caracteres.");
      }
      if (registerForm.password !== registerForm.confirmPassword) {
        throw new Error("La confirmación de contraseña no coincide.");
      }

      const response = await postJson("/auth/register", {
        ...registerForm,
        username: trimmedUsername,
        email: trimmedEmail,
      });

      dispatch(setCurrentUser(response.currentUser));
      setStatus(
        response.currentUser?.isSuperAdmin
          ? "Cuenta creada con permisos de superadmin."
          : "Cuenta creada correctamente."
      );
      setRegisterForm({
        name: "",
        username: "",
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
      const trimmedIdentifier = loginForm.identifier.trim().toLowerCase();
      if (!trimmedIdentifier || !loginForm.password) {
        throw new Error("Ingresa usuario o correo y contraseña.");
      }

      const response = await postJson("/auth/login", {
        identifier: trimmedIdentifier,
        password: loginForm.password,
      });

      dispatch(setCurrentUser(response.currentUser));
      setStatus(response.currentUser?.isAdmin ? "Sesión administradora iniciada." : "Sesión iniciada.");
      setLoginForm({ identifier: "", password: "" });
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
              Email y contraseña funcionan hoy; Google y GitHub se activan desde el backend cuando las credenciales OAuth están listas.
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

        <div className="auth-provider-grid">
          <button
            className="button-secondary provider-button"
            disabled={!googleEnabled || isSubmitting}
            onClick={() => startProviderFlow("google")}
            type="button"
          >
            Continuar con Google
          </button>
          <button
            className="button-secondary provider-button"
            disabled={!githubEnabled || isSubmitting}
            onClick={() => startProviderFlow("github")}
            type="button"
          >
            Continuar con GitHub
          </button>
        </div>
        {!googleEnabled || !githubEnabled ? (
          <p className="form-hint">
            {googleEnabled || githubEnabled
              ? "Uno de los proveedores sociales está listo; el otro necesita credenciales del servidor."
              : "Google y GitHub necesitan credenciales OAuth del backend para activarse."}
          </p>
        ) : null}

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
            <label className="field-group" htmlFor="register-username">
              <span>Usuario</span>
              <input
                id="register-username"
                onChange={(event) => setRegisterForm((current) => ({ ...current, username: event.target.value }))}
                placeholder="sjhallo07 o marcos.mora"
                value={registerForm.username}
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
              <span>Usuario o correo</span>
              <input
                id="login-email"
                onChange={(event) => setLoginForm((current) => ({ ...current, identifier: event.target.value }))}
                placeholder="sjhallo07 o cliente@correo.com"
                value={loginForm.identifier}
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
