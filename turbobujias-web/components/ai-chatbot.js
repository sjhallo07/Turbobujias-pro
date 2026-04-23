"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

const SUGGESTED_PROMPTS = [
    "¿Qué bujía sirve para Toyota Corolla 2014 1.8?",
    "Necesito un calentador para Hilux 2.5 diesel 2012.",
    "Dame el resumen total del inventario y la base de datos.",
    "Analiza una foto de una bujía o calentador y dime qué ves.",
];

const DEFAULT_PUBLIC_CHAT_URL =
    process.env.NEXT_PUBLIC_HF_SPACE_URL || "https://huggingface.co/spaces/sjhallo07/turbobujias-fullstack";

function buildGoogleSearchUrl(query) {
    const normalizedQuery = String(query || "").trim();
    const searchText = normalizedQuery || "spark plugs glow plugs diesel parts Turbobujias Pro";
    return `https://www.google.com/search?q=${encodeURIComponent(searchText)}`;
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
        reader.readAsDataURL(file);
    });
}

function normalizeChatPayload(result) {
    const raw = result?.data;
    const payload = Array.isArray(raw) ? raw[0] : raw;

    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        return {
            reply: String(payload.reply || ""),
            sources: Array.isArray(payload.sources) ? payload.sources : [],
            history: Array.isArray(payload.history) ? payload.history : [],
        };
    }

    return {
        reply: "",
        sources: [],
        history: [],
    };
}

export default function AiChatbot({ publicChatUrl = DEFAULT_PUBLIC_CHAT_URL }) {
    const endpointRef = useRef("/api/ai-chat");
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content:
                "Hola, soy el asistente de Turbobujias Pro. Pregúntame por compatibilidad, SKU, UPC, totales de inventario o envíame una foto de la pieza.",
            sources: [],
        },
    ]);
    const [history, setHistory] = useState([]);
    const [input, setInput] = useState("");
    const [imageDataUrl, setImageDataUrl] = useState("");
    const [imageName, setImageName] = useState("");
    const [isConnecting, setIsConnecting] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [status, setStatus] = useState("Listo para ayudarte.");
    const [error, setError] = useState("");

    const canSend = (input.trim().length > 0 || Boolean(imageDataUrl)) && !isSending;
    const searchSeed = useMemo(() => {
        if (input.trim()) {
            return input.trim();
        }

        const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
        return latestUserMessage?.content || "";
    }, [input, messages]);
    const helperText = useMemo(() => {
        if (isConnecting) {
            return "Conectando con el Space de Gradio…";
        }
        if (isSending) {
            return imageDataUrl
                ? "Analizando imagen, catálogo y compatibilidad…"
                : "Consultando catálogo y generando respuesta…";
        }
        return status;
    }, [imageDataUrl, isConnecting, isSending, status]);

    useEffect(() => {
        function handlePrefill(event) {
            const detail = event.detail || {};
            if (typeof detail.prompt === "string") {
                setInput(detail.prompt);
                setStatus("Prompt sugerido cargado desde el catálogo.");
            }
        }

        window.addEventListener("tb-ai-prefill", handlePrefill);
        return () => window.removeEventListener("tb-ai-prefill", handlePrefill);
    }, []);

    async function getClient() {
        setIsConnecting(true);
        try {
            setStatus("Conectado con el asistente de IA.");
            return endpointRef.current;
        } finally {
            setIsConnecting(false);
        }
    }

    async function sendMessage(messageText, attachedImageDataUrl = imageDataUrl, attachedImageName = imageName) {
        const message = messageText.trim();
        if ((!message && !attachedImageDataUrl) || isSending) {
            return;
        }

        setIsSending(true);
        setError("");
        setInput("");
        setMessages((current) => [
            ...current,
            {
                role: "user",
                content: message || `Imagen enviada para análisis${attachedImageName ? `: ${attachedImageName}` : "."}`,
                sources: [],
            },
        ]);

        try {
            const endpoint = await getClient();
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message,
                    history,
                    imageDataUrl: attachedImageDataUrl,
                }),
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "No se pudo conectar con el asistente.");
            }

            const payload = normalizeChatPayload(result);
            const reply = payload.reply || "No recibí una respuesta útil del asistente todavía.";

            setHistory(payload.history);
            setMessages((current) => [
                ...current,
                {
                    role: "assistant",
                    content: reply,
                    sources: payload.sources,
                },
            ]);
            setStatus(payload.sources?.length ? `Fuentes: ${payload.sources.join(", ")}` : "Respuesta lista.");
            setImageDataUrl("");
            setImageName("");
        } catch (sendError) {
            const messageText =
                sendError instanceof Error
                    ? sendError.message
                    : "No se pudo completar la consulta al chatbot.";
            setError(messageText);
            setMessages((current) => [
                ...current,
                {
                    role: "assistant",
                    content:
                        "No pude responder en este momento. Verifica que el Space esté activo y que el endpoint /chat esté desplegado.",
                    sources: [],
                },
            ]);
            setStatus("Error de conexión.");
        } finally {
            setIsSending(false);
        }
    }

    async function handleImageChange(event) {
        const file = event.target.files?.[0];
        if (!file) {
            setImageDataUrl("");
            setImageName("");
            return;
        }

        if (!file.type.startsWith("image/")) {
            setError("Selecciona una imagen válida para analizar la pieza.");
            return;
        }

        if (file.size > 4 * 1024 * 1024) {
            setError("La imagen debe pesar menos de 4 MB.");
            return;
        }

        try {
            const nextImageDataUrl = await readFileAsDataUrl(file);
            setError("");
            setImageDataUrl(nextImageDataUrl);
            setImageName(file.name);
            setStatus("Imagen lista para análisis visual.");
        } catch (imageError) {
            setError(imageError instanceof Error ? imageError.message : "No se pudo cargar la imagen.");
        }
    }

    function handleSubmit(event) {
        event.preventDefault();
        void sendMessage(input);
    }

    return (
        <section className="panel ai-chatbot-panel" id="ai-chatbot-section">
            <div className="section-heading ai-chatbot-heading">
                <div>
                    <h2>Chatbot IA integrado</h2>
                    <p>
                        Habla con el asistente sin salir del storefront. Ideal para compatibilidad,
                        comparación de marcas y confirmación rápida de SKU.
                    </p>
                </div>
                <span className="tag">Gradio + Hugging Face</span>
            </div>

            <div className="ai-chatbot-shell">
                <div className="ai-chatbot-messages" aria-live="polite">
                    {messages.map((message, index) => (
                        <article
                            className={`ai-chatbot-message ${message.role === "user" ? "user" : "assistant"}`}
                            key={`${message.role}-${index}`}
                        >
                            <div className="ai-chatbot-role">
                                {message.role === "user" ? "Tú" : "Asistente"}
                            </div>
                            <p>{message.content}</p>
                            {message.sources?.length ? (
                                <div className="ai-chatbot-sources">
                                    {message.sources.map((source) => (
                                        <span className="pill" key={`${index}-${source}`}>
                                            {source}
                                        </span>
                                    ))}
                                </div>
                            ) : null}
                        </article>
                    ))}
                </div>

                <div className="ai-chatbot-sidecar">
                    <div className="support-card ai-chatbot-card">
                        <strong>Sugerencias rápidas</strong>
                        <div className="ai-chatbot-prompts">
                            {SUGGESTED_PROMPTS.map((prompt) => (
                                <button
                                    className="button-chip"
                                    key={prompt}
                                    onClick={() => void sendMessage(prompt)}
                                    type="button"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="support-card ai-chatbot-card">
                        <strong>Herramientas rápidas</strong>
                        <div className="ai-chatbot-prompts">
                            <button
                                className="button-secondary"
                                onClick={() => void sendMessage("Dame el resumen total del inventario y la base de datos.")}
                                type="button"
                            >
                                Leer inventario total
                            </button>
                            <a
                                className="button-secondary text-button"
                                href={buildGoogleSearchUrl(searchSeed)}
                                rel="noreferrer"
                                target="_blank"
                            >
                                Web search en Google
                            </a>
                            <a
                                className="button-secondary text-button"
                                href={publicChatUrl}
                                rel="noreferrer"
                                target="_blank"
                            >
                                Abrir en ventana secundaria
                            </a>
                        </div>
                    </div>

                    <div className="support-card ai-chatbot-card">
                        <strong>Estado</strong>
                        <p>{helperText}</p>
                        <p className="muted">
                            Sube una foto para reconocimiento visual u obtén apoyo con QR, SKU, UPC y búsquedas web.
                        </p>
                        {error ? <p className="ai-chatbot-error">{error}</p> : null}
                    </div>
                </div>
            </div>

            <form className="ai-chatbot-form" onSubmit={handleSubmit}>
                <label className="field-group" htmlFor="ai-chatbot-input">
                    <span>Pregunta al asistente</span>
                    <textarea
                        id="ai-chatbot-input"
                        onChange={(event) => setInput(event.target.value)}
                        placeholder="Ej. ¿Cuál bujía recomiendas para un Aveo 1.6 2010?"
                        rows={3}
                        value={input}
                    />
                </label>
                <label className="field-group" htmlFor="ai-chatbot-image">
                    <span>Imagen de referencia (opcional)</span>
                    <input
                        accept="image/*"
                        id="ai-chatbot-image"
                        onChange={(event) => void handleImageChange(event)}
                        type="file"
                    />
                </label>
                {imageDataUrl ? (
                    <div className="ai-chatbot-image-preview">
                        <Image
                            alt={imageName || "Imagen seleccionada"}
                            height={260}
                            src={imageDataUrl}
                            unoptimized
                            width={520}
                        />
                        <div className="actions-row">
                            <span className="muted">{imageName || "Imagen lista para análisis"}</span>
                            <button
                                className="button-secondary"
                                onClick={() => {
                                    setImageDataUrl("");
                                    setImageName("");
                                }}
                                type="button"
                            >
                                Quitar imagen
                            </button>
                        </div>
                    </div>
                ) : null}
                <div className="actions-row">
                    <button className="button-primary" disabled={!canSend} type="submit">
                        {isSending ? "Consultando…" : imageDataUrl ? "Enviar imagen y mensaje" : "Enviar mensaje"}
                    </button>
                    <button
                        className="button-secondary"
                        onClick={() => {
                            setMessages([
                                {
                                    role: "assistant",
                                    content:
                                        "Hola, soy el asistente de Turbobujias Pro. Pregúntame por compatibilidad, SKU, UPC, totales de inventario o envíame una foto de la pieza.",
                                    sources: [],
                                },
                            ]);
                            setHistory([]);
                            setInput("");
                            setImageDataUrl("");
                            setImageName("");
                            setError("");
                            setStatus("Conversación reiniciada.");
                        }}
                        type="button"
                    >
                        Reiniciar chat
                    </button>
                </div>
            </form>
        </section>
    );
}
