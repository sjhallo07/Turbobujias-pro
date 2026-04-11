"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import QrScanner from "./qr-scanner";
import {
  addToCart,
  clearCart,
  decrementQuantity,
  incrementQuantity,
  removeFromCart,
  selectCartCount,
  selectCartItems,
  selectCartTotals,
} from "../lib/cartSlice";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
const HF_SPACE_URL =
  process.env.NEXT_PUBLIC_HF_SPACE_URL || "https://sjhallo07-turbobujias-ai.hf.space";
const TAX_RATE = 0.16;
const SHIPPING_USD = 8;
const PARTNER_BRAND_COPY = {
  NGK: "Encendido confiable para alta rotación y taller.",
  Bosch: "Cobertura europea y desempeño estable en calle.",
  Champion: "Opciones de trabajo pesado para flotas y pick-ups.",
  Denso: "Tecnología OEM ideal para vehículos asiáticos.",
};
const DEFAULT_PARTNER_BRANDS = ["NGK", "Bosch", "Champion", "Denso"];
const CUSTOMER_REVIEWS = [
  {
    name: "Luis R.",
    location: "Valencia",
    quote:
      "La búsqueda por aplicación me ayudó a ubicar las bujías para un Corolla en menos de un minuto. El precio en bolívares sale listo para enviar al cliente.",
  },
  {
    name: "Taller El Pistón",
    location: "Naguanagua",
    quote:
      "El catálogo carga rápido, el stock se ve claro y el carrito sirve perfecto para armar cotizaciones de varias marcas en una sola pantalla.",
  },
  {
    name: "María G.",
    location: "Puerto Cabello",
    quote:
      "Me gustó ver las marcas principales y el soporte con IA. Hace más fácil escoger el repuesto correcto cuando llegan dudas por WhatsApp.",
  },
];

function formatCurrency(amount, currency) {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function renderPrice(item, currencyMode) {
  if (currencyMode === "VES") {
    return formatCurrency(item.price_ves, "VES");
  }

  return formatCurrency(item.price_usd, "USD");
}

function useInventory() {
  const [items, setItems] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(0);
  const [rateSource, setRateSource] = useState("FALLBACK");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchInventory() {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetch(`${API_URL}/inventory`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("No se pudo cargar el inventario.");
        }

        const payload = await response.json();
        if (!isMounted) {
          return;
        }

        setItems(payload.items || []);
        setExchangeRate(payload.exchange_rate || 0);
        setRateSource(payload.rate_source || "FALLBACK");
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError.message || "Error inesperado al cargar productos.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchInventory();

    return () => {
      isMounted = false;
    };
  }, []);

  return { items, exchangeRate, rateSource, isLoading, error };
}

function InventoryCard({ item, currencyMode, onAdd }) {
  return (
    <article className="product-card">
      <div className="product-card-header">
        <div>
          <div className="pill">{item.brand}</div>
          <h3>
            {item.model} · {item.sku}
          </h3>
        </div>
        <div className={`pill ${item.stock > 40 ? "success" : "warning"}`}>
          Stock: {item.stock}
        </div>
      </div>

      <div className="product-card-body">
        <div className="price-line">
          <strong>{renderPrice(item, currencyMode)}</strong>
          <span>{currencyMode === "VES" ? "Precio BCV" : "Precio base USD"}</span>
        </div>

        <div className="product-meta">
          <dl>
            <div>
              <dt>UPC</dt>
              <dd>{item.upc}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{item.type === "diesel_glow_plug" ? "Calentador" : "Bujía"}</dd>
            </div>
            <div>
              <dt>Rosca</dt>
              <dd>{item.thread}</dd>
            </div>
            <div>
              <dt>Alcance</dt>
              <dd>{item.reach}</dd>
            </div>
            <div>
              <dt>Hex</dt>
              <dd>{item.hex}</dd>
            </div>
            <div>
              <dt>Electrodo / Voltaje</dt>
              <dd>{item.electrode || item.voltage || "—"}</dd>
            </div>
          </dl>
        </div>

        <div>
          <strong>Aplicaciones</strong>
          <ul className="applications-list">
            {item.application.map((application) => (
              <li key={`${item.sku}-${application}`}>{application}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="product-card-footer">
        <div className="actions-row">
          <button className="button-primary" onClick={() => onAdd(item)} type="button">
            Agregar al carrito
          </button>
          <button
            className="button-secondary"
            onClick={() => window.open(`${HF_SPACE_URL}`, "_blank", "noopener,noreferrer")}
            type="button"
          >
            Consultar con IA
          </button>
        </div>
      </div>
    </article>
  );
}

function CartPanel({ currencyMode, exchangeRate }) {
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);
  const itemCount = useSelector(selectCartCount);
  const totals = useSelector(selectCartTotals);

  const subtotalUsd = totals.subtotal;
  const taxUsd = subtotalUsd * TAX_RATE;
  const shippingUsd = subtotalUsd > 100 || subtotalUsd === 0 ? 0 : SHIPPING_USD;
  const totalUsd = subtotalUsd + taxUsd + shippingUsd;
  const subtotalDisplay = currencyMode === "VES" ? subtotalUsd * exchangeRate : subtotalUsd;
  const taxDisplay = currencyMode === "VES" ? taxUsd * exchangeRate : taxUsd;
  const shippingDisplay = currencyMode === "VES" ? shippingUsd * exchangeRate : shippingUsd;
  const totalDisplay = currencyMode === "VES" ? totalUsd * exchangeRate : totalUsd;
  const currencyCode = currencyMode === "VES" ? "VES" : "USD";

  return (
    <aside className="cart-panel">
      <h2>Carrito Redux</h2>
      <p>
        {itemCount} producto(s) · impuestos y envío calculados en tiempo real con tasa{" "}
        {currencyMode === "VES" ? "BCV" : "USD"}.
      </p>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>Agrega repuestos para iniciar la cotización o preparar una orden.</p>
        </div>
      ) : (
        <>
          <div className="cart-list">
            {items.map((item) => {
              const lineTotal =
                currencyMode === "VES"
                  ? item.lineTotal * exchangeRate
                  : item.lineTotal;

              return (
                <div className="cart-item" key={item.sku}>
                  <div className="cart-item-header">
                    <div>
                      <h4>{item.brand + " " + item.model}</h4>
                      <div className="muted">{item.sku}</div>
                    </div>
                    <strong>{formatCurrency(lineTotal, currencyCode)}</strong>
                  </div>

                  <div className="cart-actions">
                    <div className="qty-controls">
                      <button
                        className="qty-button"
                        onClick={() => dispatch(decrementQuantity(item.sku))}
                        type="button"
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        className="qty-button"
                        onClick={() => dispatch(incrementQuantity(item.sku))}
                        type="button"
                      >
                        +
                      </button>
                    </div>

                    <button
                      className="button-secondary"
                      onClick={() => dispatch(removeFromCart(item.sku))}
                      type="button"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="summary-lines">
            <div className="summary-line">
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotalDisplay, currencyCode)}</strong>
            </div>
            <div className="summary-line">
              <span>IVA estimado (16%)</span>
              <strong>{formatCurrency(taxDisplay, currencyCode)}</strong>
            </div>
            <div className="summary-line">
              <span>Envío estimado</span>
              <strong>{formatCurrency(shippingDisplay, currencyCode)}</strong>
            </div>
            <div className="summary-line total">
              <span>Total</span>
              <strong>{formatCurrency(totalDisplay, currencyCode)}</strong>
            </div>
          </div>

          <div className="actions-row">
            <button className="button-primary" type="button">
              Continuar al pago
            </button>
            <button
              className="button-secondary"
              onClick={() => dispatch(clearCart())}
              type="button"
            >
              Vaciar carrito
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

export default function Storefront() {
  const dispatch = useDispatch();
  const { items, exchangeRate, rateSource, isLoading, error } = useInventory();
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [category, setCategory] = useState("all");
  const [vehicle, setVehicle] = useState("");
  const [currencyMode, setCurrencyMode] = useState("USD");

  const brands = useMemo(() => {
    return [...new Set(items.map((item) => item.brand))].sort();
  }, [items]);

  const suggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    return items
      .filter((item) => {
        const applications = item.application.join(" ").toLowerCase();
        return (
          item.sku.toLowerCase().includes(normalizedQuery) ||
          item.upc.toLowerCase().includes(normalizedQuery) ||
          item.model.toLowerCase().includes(normalizedQuery) ||
          applications.includes(normalizedQuery)
        );
      })
      .slice(0, 5);
  }, [items, query]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedVehicle = vehicle.trim().toLowerCase();

    return items.filter((item) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        item.sku.toLowerCase().includes(normalizedQuery) ||
        item.upc.toLowerCase().includes(normalizedQuery) ||
        item.brand.toLowerCase().includes(normalizedQuery) ||
        item.model.toLowerCase().includes(normalizedQuery) ||
        item.application.join(" ").toLowerCase().includes(normalizedQuery);

      const matchesBrand = brand === "all" || item.brand === brand;
      const matchesCategory = category === "all" || item.type === category;
      const matchesVehicle =
        normalizedVehicle.length === 0 ||
        item.application.join(" ").toLowerCase().includes(normalizedVehicle);

      return matchesQuery && matchesBrand && matchesCategory && matchesVehicle;
    });
  }, [brand, category, items, query, vehicle]);

  const stats = useMemo(() => {
    const lowStockCount = items.filter((item) => item.stock < 50).length;
    const glowPlugCount = items.filter((item) => item.type === "diesel_glow_plug").length;

    return {
      totalProducts: items.length,
      lowStockCount,
      glowPlugCount,
    };
  }, [items]);

  const featuredBrands = useMemo(() => {
    const availableBrands = [...new Set(items.map((item) => item.brand))];
    const source = (availableBrands.length ? availableBrands : DEFAULT_PARTNER_BRANDS).slice(0, 6);

    return source.map((brandName) => ({
      name: brandName,
      description:
        PARTNER_BRAND_COPY[brandName] ||
        "Inventario activo para ventas rápidas, cotización y reposición inmediata.",
    }));
  }, [items]);

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-badge">Valencia · Carabobo · Venezuela</div>

        <div className="hero-grid">
          <div>
            <div className="brand-lockup">
              <div className="brand-icon-shell">
                <Image
                  alt="Ícono Turbobujias"
                  className="brand-icon"
                  height={84}
                  priority
                  src="/branding/turbobujias-icon.svg"
                  width={84}
                />
              </div>
              <div>
                <Image
                  alt="Logotipo de Turbobujias"
                  className="brand-logo"
                  height={72}
                  priority
                  src="/branding/turbobujias-logo.svg"
                  width={230}
                />
              </div>
            </div>
            <h1>Turbobujias Pro</h1>
            <p>
              E-commerce automotriz con búsqueda por SKU/UPC, filtros por aplicación,
              carrito Redux y precios en USD/VES para bujías, calentadores y repuestos diésel.
            </p>

            <div className="button-row">
              <button
                className={`button-chip ${currencyMode === "USD" ? "active" : ""}`}
                onClick={() => setCurrencyMode("USD")}
                type="button"
              >
                Ver en USD
              </button>
              <button
                className={`button-chip ${currencyMode === "VES" ? "active" : ""}`}
                onClick={() => setCurrencyMode("VES")}
                type="button"
              >
                Ver en VES
              </button>
              <a className="button-secondary" href={HF_SPACE_URL} rel="noreferrer" target="_blank">
                Abrir chatbot IA
              </a>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <strong>{stats.totalProducts}</strong>
              <span>SKUs en catálogo</span>
            </div>
            <div className="stat-card">
              <strong>{stats.glowPlugCount}</strong>
              <span>Calentadores diésel</span>
            </div>
            <div className="stat-card">
              <strong>{exchangeRate || "—"}</strong>
              <span>Tasa {rateSource}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="content-grid branded-content">
        <div className="panel">
          <div className="section-heading">
            <div>
              <h2>Marcas aliadas principales</h2>
              <p>
                Presentamos las marcas con mayor salida en mostrador para bujías, calentadores y
                repuestos de encendido ofrecidos por Turbobujias.
              </p>
            </div>
            <span className="tag">Ventas destacadas</span>
          </div>

          <div className="partner-grid">
            {featuredBrands.map((brandItem) => (
              <article className="brand-card" key={brandItem.name}>
                <div className="brand-card-header">
                  <div className="brand-mark">{brandItem.name.slice(0, 2).toUpperCase()}</div>
                  <strong>{brandItem.name}</strong>
                </div>
                <p>{brandItem.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <h2>Opiniones de clientes</h2>
              <p>
                Comentarios en español de clientes de mostrador, talleres y compradores frecuentes.
              </p>
            </div>
            <span className="tag">Feedback real</span>
          </div>

          <div className="reviews-grid">
            {CUSTOMER_REVIEWS.map((review) => (
              <article className="review-card" key={review.name}>
                <p>“{review.quote}”</p>
                <div className="review-author">
                  <strong>{review.name}</strong>
                  <span>{review.location}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <h2>Búsqueda inteligente</h2>
          <p>
            Filtra por SKU, UPC, marca, categoría y vehículo para encontrar el repuesto exacto.
          </p>

          <div className="field-group">
            <label htmlFor="search">Buscar por SKU, UPC o aplicación</label>
            <input
              id="search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej. NGK-BKR5E, 070185924508, Corolla 1.8..."
              value={query}
            />
          </div>

          {suggestions.length > 0 ? (
            <ul className="autocomplete">
              {suggestions.map((item) => (
                <li key={item.sku}>
                  <button onClick={() => setQuery(item.sku)} type="button">
                    <strong>{item.sku}</strong> · {item.brand} {item.model}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="filters-grid">
            <div className="field-group">
              <label htmlFor="brand">Marca</label>
              <select id="brand" onChange={(event) => setBrand(event.target.value)} value={brand}>
                <option value="all">Todas</option>
                {brands.map((brandName) => (
                  <option key={brandName} value={brandName}>
                    {brandName}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="category">Categoría</label>
              <select
                id="category"
                onChange={(event) => setCategory(event.target.value)}
                value={category}
              >
                <option value="all">Todas</option>
                <option value="spark_plug">Bujías</option>
                <option value="diesel_glow_plug">Calentadores</option>
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="vehicle">Vehículo / motor</label>
              <input
                id="vehicle"
                onChange={(event) => setVehicle(event.target.value)}
                placeholder="Hilux 2.4 Diesel, Civic 1.6..."
                value={vehicle}
              />
            </div>

            <div className="field-group">
              <label htmlFor="clear">Acciones</label>
              <button
                className="button-secondary"
                id="clear"
                onClick={() => {
                  setQuery("");
                  setBrand("all");
                  setCategory("all");
                  setVehicle("");
                }}
                type="button"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        <CartPanel currencyMode={currencyMode} exchangeRate={exchangeRate} />
      </section>

      <section className="support-grid" style={{ marginTop: "1.5rem" }}>
        <div className="support-card">
          <h3>Panel rápido de ventas</h3>
          <p>
            Ideal para talleres y ventas al mostrador: consulta inventario, detecta stock bajo y
            genera cotizaciones rápidas en doble moneda.
          </p>
          <ul className="feature-list">
            <li>Integración lista para Pago Móvil, transferencias y PayPal.</li>
            <li>Carrito con Redux Toolkit y actualización instantánea.</li>
            <li>Preparado para sincronizarse con Mercado Libre.</li>
          </ul>
        </div>

        <div className="scanner-card">
          <h3>Scanner QR / Código de barras</h3>
          <p>
            Usa la cámara para capturar el UPC/SKU de una caja y completar la búsqueda
            automáticamente.
          </p>
          <QrScanner onDetected={setQuery} />
        </div>
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <div className="panel">
          <h2>Catálogo disponible</h2>
          <p>
            {filteredItems.length} resultado(s) · {stats.lowStockCount} producto(s) con stock bajo.
          </p>

          {isLoading ? (
            <div className="empty-state">
              <p>Cargando inventario desde el backend…</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <p>{error}</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">
              <p>No se encontraron repuestos con los filtros actuales.</p>
            </div>
          ) : (
            <div className="product-grid">
              {filteredItems.map((item) => (
                <InventoryCard
                  currencyMode={currencyMode}
                  item={item}
                  key={item.sku}
                  onAdd={(selectedItem) => dispatch(addToCart(selectedItem))}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <p className="footer-note">
        Frontend Next.js listo para continuar con checkout, login, panel admin y automatizaciones IA.
      </p>
    </main>
  );
}
