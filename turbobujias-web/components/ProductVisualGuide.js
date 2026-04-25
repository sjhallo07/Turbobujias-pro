"use client";

import Image from "next/image";
import {
  SPARK_PLUG_IMAGE,
  GLOW_PLUG_IMAGE,
  PRODUCT_COMPARISON,
  VISUAL_GUIDES,
  QUICK_ID_CHART,
} from "../lib/product-images";

/**
 * ProductVisualGuide Component
 * Shows real product images and identification guides
 */
export default function ProductVisualGuide() {
  return (
    <div className="visual-guide-container">
      {/* Quick Identification Chart */}
      <section className="quick-id-section">
        <h2>Identificación Rápida</h2>
        <p>Compara visualmente estas dos piezas clave antes de buscar en el catálogo.</p>
        
        <div className="comparison-grid">
          {/* Spark Plug Card */}
          <article className="product-comparison-card spark-plug-card">
            <div className="product-image-wrapper">
              <img
                alt="Bujía (Spark Plug) - NGK BKR5E"
                className="product-comparison-image"
                src={SPARK_PLUG_IMAGE.dataUrl}
              />
            </div>
            <div className="product-comparison-info">
              <h3>Bujía (Spark Plug)</h3>
              <dl className="comparison-specs">
                <div>
                  <dt>Tamaño</dt>
                  <dd>{QUICK_ID_CHART["Spark Plug"].size}</dd>
                </div>
                <div>
                  <dt>Color</dt>
                  <dd>{QUICK_ID_CHART["Spark Plug"].color}</dd>
                </div>
                <div>
                  <dt>Forma</dt>
                  <dd>{QUICK_ID_CHART["Spark Plug"].shape}</dd>
                </div>
                <div>
                  <dt>Terminal</dt>
                  <dd>{QUICK_ID_CHART["Spark Plug"].terminal}</dd>
                </div>
              </dl>
              <ul className="identification-list">
                {PRODUCT_COMPARISON.spark_plug.identification.map((item, idx) => (
                  <li key={idx}>✓ {item}</li>
                ))}
              </ul>
            </div>
          </article>

          {/* Glow Plug Card */}
          <article className="product-comparison-card glow-plug-card">
            <div className="product-image-wrapper">
              <img
                alt="Calentador Diésel (Glow Plug) - Bosch"
                className="product-comparison-image"
                src={GLOW_PLUG_IMAGE.dataUrl}
              />
            </div>
            <div className="product-comparison-info">
              <h3>Calentador Diésel (Glow Plug)</h3>
              <dl className="comparison-specs">
                <div>
                  <dt>Tamaño</dt>
                  <dd>{QUICK_ID_CHART["Glow Plug"].size}</dd>
                </div>
                <div>
                  <dt>Color</dt>
                  <dd>{QUICK_ID_CHART["Glow Plug"].color}</dd>
                </div>
                <div>
                  <dt>Forma</dt>
                  <dd>{QUICK_ID_CHART["Glow Plug"].shape}</dd>
                </div>
                <div>
                  <dt>Terminal</dt>
                  <dd>{QUICK_ID_CHART["Glow Plug"].terminal}</dd>
                </div>
              </dl>
              <ul className="identification-list">
                {PRODUCT_COMPARISON.glow_plug.identification.map((item, idx) => (
                  <li key={idx}>✓ {item}</li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </section>

      {/* Detailed Visual Guides */}
      <section className="visual-guides-section">
        <h2>Guías Visuales Detalladas</h2>
        
        <div className="guides-grid">
          {VISUAL_GUIDES.map((guide) => (
            <article key={guide.id} className="visual-guide-card">
              <div className="guide-image-section">
                <img
                  alt={guide.title}
                  className="guide-product-image"
                  src={guide.image}
                />
                <span className="guide-badge">{guide.type === "spark_plug" ? "BUJÍA" : "DIÉSEL"}</span>
              </div>

              <div className="guide-content">
                <h3>{guide.title}</h3>

                <div className="guide-steps">
                  <strong>Pasos de identificación:</strong>
                  <ol className="steps-list">
                    {guide.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>

                <div className="guide-tips">
                  <strong>Diferencias por marca:</strong>
                  <ul className="tips-list">
                    {guide.tips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Characteristics Comparison */}
      <section className="characteristics-section">
        <h2>Características Técnicas Comparadas</h2>
        
        <div className="characteristics-table">
          <table>
            <thead>
              <tr>
                <th>Característica</th>
                <th>Bujía (Spark Plug)</th>
                <th>Calentador Diésel</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Tamaño</strong></td>
                <td>{PRODUCT_COMPARISON.spark_plug.characteristics.size}</td>
                <td>{PRODUCT_COMPARISON.glow_plug.characteristics.size}</td>
              </tr>
              <tr>
                <td><strong>Función</strong></td>
                <td>{PRODUCT_COMPARISON.spark_plug.characteristics.function}</td>
                <td>{PRODUCT_COMPARISON.glow_plug.characteristics.function}</td>
              </tr>
              <tr>
                <td><strong>Instalación</strong></td>
                <td>{PRODUCT_COMPARISON.spark_plug.characteristics.installation}</td>
                <td>{PRODUCT_COMPARISON.glow_plug.characteristics.installation}</td>
              </tr>
              <tr>
                <td><strong>Vida útil</strong></td>
                <td>{PRODUCT_COMPARISON.spark_plug.characteristics.lifespan}</td>
                <td>{PRODUCT_COMPARISON.glow_plug.characteristics.lifespan}</td>
              </tr>
              <tr>
                <td><strong>Costo aprox.</strong></td>
                <td>{PRODUCT_COMPARISON.spark_plug.characteristics.cost}</td>
                <td>{PRODUCT_COMPARISON.glow_plug.characteristics.cost}</td>
              </tr>
              <tr>
                <td><strong>Marcas comunes</strong></td>
                <td>{PRODUCT_COMPARISON.spark_plug.brands.join(", ")}</td>
                <td>{PRODUCT_COMPARISON.glow_plug.brands.join(", ")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA Section */}
      <section className="visual-guide-cta">
        <h2>¿Aún dudas cuál es?</h2>
        <p>Usa estas guías visuales antes de buscar en el catálogo o consulta con el chatbot IA.</p>
        <div className="cta-buttons">
          <button className="button-secondary" onClick={() => document.getElementById("ai-chatbot-section")?.scrollIntoView({ behavior: "smooth" })}>
            Consultar con IA
          </button>
          <button className="button-primary" onClick={() => document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" })}>
            Ver catálogo
          </button>
        </div>
      </section>

      <style jsx>{`
        .visual-guide-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          padding: 2rem;
          background: var(--color-background);
        }

        .quick-id-section,
        .visual-guides-section,
        .characteristics-section,
        .visual-guide-cta {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        h2 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .comparison-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .product-comparison-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .product-comparison-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .product-image-wrapper {
          width: 100%;
          height: 200px;
          background: var(--color-background);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .product-comparison-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .product-comparison-info h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .comparison-specs {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .comparison-specs div {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .comparison-specs dt {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .comparison-specs dd {
          font-size: 0.95rem;
          color: var(--color-text);
        }

        .identification-list {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .identification-list li {
          font-size: 0.9rem;
          color: var(--color-text);
        }

        .guides-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .visual-guide-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          overflow: hidden;
          transition: transform 0.2s;
        }

        .visual-guide-card:hover {
          transform: translateY(-4px);
        }

        .guide-image-section {
          position: relative;
          width: 100%;
          height: 220px;
          background: var(--color-background);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .guide-product-image {
          max-width: 90%;
          max-height: 90%;
          object-fit: contain;
        }

        .guide-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .guide-content {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .guide-content h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0;
        }

        .guide-steps,
        .guide-tips {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .guide-steps strong,
        .guide-tips strong {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .steps-list,
        .tips-list {
          list-style: none;
          padding-left: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin: 0;
        }

        .steps-list li,
        .tips-list li {
          font-size: 0.875rem;
          color: var(--color-text);
          line-height: 1.5;
        }

        .characteristics-section {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 1.5rem;
          margin-top: 1rem;
        }

        .characteristics-table {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        thead {
          background: var(--color-background);
        }

        th {
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          font-size: 0.9rem;
          border-bottom: 2px solid var(--color-border);
        }

        td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--color-border);
          font-size: 0.9rem;
        }

        tbody tr:hover {
          background: var(--color-background);
        }

        .visual-guide-cta {
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          color: white;
          padding: 2rem;
          border-radius: 12px;
          text-align: center;
        }

        .visual-guide-cta h2 {
          color: white;
          margin-bottom: 0.5rem;
        }

        .visual-guide-cta p {
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 1.5rem;
        }

        .cta-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        @media (max-width: 768px) {
          .comparison-grid,
          .guides-grid {
            grid-template-columns: 1fr;
          }

          .comparison-specs {
            grid-template-columns: 1fr;
          }

          table {
            font-size: 0.85rem;
          }

          th,
          td {
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
