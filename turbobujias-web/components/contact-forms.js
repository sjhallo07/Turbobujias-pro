"use client";

import { useEffect, useMemo, useState } from "react";

const DIRECT_WHATSAPP_MESSAGE = "Hola, necesito ayuda con un pedido en Turbobujias Pro.";

function openWhatsAppWindow(url) {
  if (typeof window === "undefined") {
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export default function ContactForms({ authenticatedUser, quoteSeed, whatsappUrl, buildWhatsAppUrl }) {
  const [contactForm, setContactForm] = useState({
    name: authenticatedUser?.name || "",
    phone: authenticatedUser?.phone || "",
    email: authenticatedUser?.email || "",
    message: "Necesito ayuda con disponibilidad, pagos o despacho.",
  });
  const [quoteForm, setQuoteForm] = useState({
    name: authenticatedUser?.name || "",
    phone: authenticatedUser?.phone || "",
    email: authenticatedUser?.email || "",
    vehicle: quoteSeed.vehicle || "",
    sku: quoteSeed.query || "",
    quantity: "1",
    notes: authenticatedUser?.business
      ? `Cliente asociado a ${authenticatedUser.business}.`
      : "Necesito cotización en USD y VES.",
  });
  const [contactStatus, setContactStatus] = useState("");
  const [quoteStatus, setQuoteStatus] = useState("");

  useEffect(() => {
    setContactForm((current) => ({
      ...current,
      name: current.name || authenticatedUser?.name || "",
      phone: current.phone || authenticatedUser?.phone || "",
      email: current.email || authenticatedUser?.email || "",
    }));
    setQuoteForm((current) => ({
      ...current,
      name: current.name || authenticatedUser?.name || "",
      phone: current.phone || authenticatedUser?.phone || "",
      email: current.email || authenticatedUser?.email || "",
      vehicle: current.vehicle || quoteSeed.vehicle || "",
      sku: current.sku || quoteSeed.query || "",
      notes:
        current.notes ||
        (authenticatedUser?.business
          ? `Cliente asociado a ${authenticatedUser.business}.`
          : "Necesito cotización en USD y VES."),
    }));
  }, [authenticatedUser, quoteSeed.query, quoteSeed.vehicle]);

  const quoteSummary = useMemo(() => {
    return [quoteForm.vehicle, quoteForm.sku, quoteForm.quantity]
      .filter(Boolean)
      .join(" · ");
  }, [quoteForm.quantity, quoteForm.sku, quoteForm.vehicle]);

  function handleContactSubmit(event) {
    event.preventDefault();
    const contactMessage = [
      "Hola Turbobujias Pro, necesito atención comercial.",
      `Nombre: ${contactForm.name || "No indicado"}`,
      `Teléfono: ${contactForm.phone || "No indicado"}`,
      `Correo: ${contactForm.email || "No indicado"}`,
      `Mensaje: ${contactForm.message || "Sin mensaje"}`,
    ].join("\n");

    openWhatsAppWindow(buildWhatsAppUrl(whatsappUrl, contactMessage));
    setContactStatus("Contacto enviado a WhatsApp para seguimiento inmediato.");
  }

  function handleQuoteSubmit(event) {
    event.preventDefault();
    const quoteMessage = [
      "Hola, necesito una cotización con Turbobujias Pro.",
      `Nombre: ${quoteForm.name || "No indicado"}`,
      `Teléfono: ${quoteForm.phone || "No indicado"}`,
      `Correo: ${quoteForm.email || "No indicado"}`,
      `Vehículo / motor: ${quoteForm.vehicle || "No indicado"}`,
      `SKU o repuesto: ${quoteForm.sku || "No indicado"}`,
      `Cantidad: ${quoteForm.quantity || "1"}`,
      `Observaciones: ${quoteForm.notes || "Sin observaciones"}`,
    ].join("\n");

    openWhatsAppWindow(buildWhatsAppUrl(whatsappUrl, quoteMessage));
    setQuoteStatus("Cotización enviada a WhatsApp. Un asesor puede responder con stock y pago.");
  }

  return (
    <section className="content-grid form-section" id="contact-section">
      <article className="panel">
        <div className="section-heading">
          <div>
            <h2>Contacto comercial</h2>
            <p>Canal rápido para soporte, seguimiento y coordinación de pagos o entregas.</p>
          </div>
          <span className="tag">WhatsApp first</span>
        </div>
        <form className="form-stack" onSubmit={handleContactSubmit}>
          <label className="field-group" htmlFor="contact-name">
            <span>Nombre</span>
            <input
              id="contact-name"
              onChange={(event) => setContactForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Nombre y apellido"
              value={contactForm.name}
            />
          </label>
          <label className="field-group" htmlFor="contact-phone">
            <span>Teléfono</span>
            <input
              id="contact-phone"
              onChange={(event) => setContactForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="0414-0000000"
              value={contactForm.phone}
            />
          </label>
          <label className="field-group" htmlFor="contact-email">
            <span>Correo</span>
            <input
              id="contact-email"
              onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="cliente@correo.com"
              type="email"
              value={contactForm.email}
            />
          </label>
          <label className="field-group" htmlFor="contact-message">
            <span>Mensaje</span>
            <textarea
              id="contact-message"
              onChange={(event) =>
                setContactForm((current) => ({ ...current, message: event.target.value }))
              }
              placeholder="Cuéntanos qué necesitas"
              rows={4}
              value={contactForm.message}
            />
          </label>
          <div className="actions-row">
            <button className="button-primary" type="submit">
              Enviar por WhatsApp
            </button>
            <a className="button-secondary text-button" href={buildWhatsAppUrl(whatsappUrl, DIRECT_WHATSAPP_MESSAGE)} rel="noreferrer" target="_blank">
              Abrir chat directo
            </a>
          </div>
          {contactStatus ? <p className="form-success">{contactStatus}</p> : null}
        </form>
      </article>

      <article className="panel">
        <div className="section-heading">
          <div>
            <h2>Cotización express</h2>
            <p>Solicita precio, disponibilidad y método de pago para bujías o repuestos diésel.</p>
          </div>
          <span className="tag">{quoteSummary || "Checklist listo"}</span>
        </div>
        <form className="form-stack" onSubmit={handleQuoteSubmit}>
          <label className="field-group" htmlFor="quote-name">
            <span>Nombre</span>
            <input
              id="quote-name"
              onChange={(event) => setQuoteForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Cliente o taller"
              value={quoteForm.name}
            />
          </label>
          <label className="field-group" htmlFor="quote-vehicle">
            <span>Vehículo / motor</span>
            <input
              id="quote-vehicle"
              onChange={(event) => setQuoteForm((current) => ({ ...current, vehicle: event.target.value }))}
              placeholder="Hilux 2.5 diesel 2012"
              value={quoteForm.vehicle}
            />
          </label>
          <div className="filters-grid compact-grid">
            <label className="field-group" htmlFor="quote-sku">
              <span>SKU o repuesto</span>
              <input
                id="quote-sku"
                onChange={(event) => setQuoteForm((current) => ({ ...current, sku: event.target.value }))}
                placeholder="NGK-BKR5E o filtro diésel"
                value={quoteForm.sku}
              />
            </label>
            <label className="field-group" htmlFor="quote-quantity">
              <span>Cantidad</span>
              <input
                id="quote-quantity"
                min="1"
                onChange={(event) => setQuoteForm((current) => ({ ...current, quantity: event.target.value }))}
                type="number"
                value={quoteForm.quantity}
              />
            </label>
          </div>
          <label className="field-group" htmlFor="quote-notes">
            <span>Notas</span>
            <textarea
              id="quote-notes"
              onChange={(event) => setQuoteForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Método de pago, urgencia, delivery..."
              rows={4}
              value={quoteForm.notes}
            />
          </label>
          <div className="actions-row">
            <button className="button-primary" type="submit">
              Solicitar cotización
            </button>
            <span className="muted">Respuesta ideal para inventario, despacho y métodos de pago.</span>
          </div>
          {quoteStatus ? <p className="form-success">{quoteStatus}</p> : null}
        </form>
      </article>
    </section>
  );
}
