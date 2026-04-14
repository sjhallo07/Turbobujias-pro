"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const SUGGESTED_PROMPTS = [
    "¿Qué bujía sirve para Toyota Corolla 2014 1.8?",
    "Necesito un calentador para Hilux 2.5 diesel 2012.",
    "Compare NGK y Bosch para un Civic 1.6 1998.",
];

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

function normalizeMediaPayload(result) {
    const raw = result?.data;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        return raw;
    }
    return null;
}

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return "0 KB";
    }
    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.ceil(bytes / 1024)} KB`;
}

export default function AiChatbot() {
    const endpointRef = useRef("/api/ai-chat");
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content:
                "Hola, soy el asistente de Turbobujias Pro. Pregúntame por compatibilidad, SKU, UPC o aplicaciones de bujías y calentadores.",
            sources: [],
        },
    ]);
    const [history, setHistory] = useState([]);
    const [input, setInput] = useState("");
    const [isConnecting, setIsConnecting] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeechAvailable, setIsSpeechAvailable] = useState(false);
    const [speechError, setSpeechError] = useState("");
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [isAnalyzingMedia, setIsAnalyzingMedia] = useState(false);
    const [mediaResult, setMediaResult] = useState(null);
    const [status, setStatus] = useState("Listo para ayudarte.");
    const [error, setError] = useState("");
    const speechRef = useRef(null);

    const canSend = input.trim().length > 0 && !isSending;
    const helperText = useMemo(() => {
        if (isConnecting) {
            return "Conectando con el Space de Gradio…";
        }
        if (isSending) {
            return "Consultando catálogo y generando respuesta…";
        }
        return status;
    }, [isConnecting, isSending, status]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition || null;

        if (!SpeechRecognition) {
            setIsSpeechAvailable(false);
            return;
        }

        const recognition = new SpeechRecognition();
        const browserLanguage = navigator.language || "";
        recognition.lang = browserLanguage || "es-VE";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            setSpeechError("");
            setStatus("Escuchando… habla ahora.");
        };
        recognition.onresult = (event) => {
            const transcript = event.results?.[0]?.[0]?.transcript || "";
            if (transcript.trim()) {
                setInput((current) => [current, transcript.trim()].filter(Boolean).join(" "));
                setStatus("Texto dictado listo para enviar.");
            }
        };
        recognition.onerror = (event) => {
            setSpeechError(`No se pudo capturar voz (${event.error || "error desconocido"}).`);
            setStatus("No se pudo usar dictado por voz.");
        };
        recognition.onend = () => {
            setIsListening(false);
        };

        speechRef.current = recognition;
        setIsSpeechAvailable(true);

        return () => {
            speechRef.current?.stop();
            speechRef.current = null;
        };
    }, []);

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

    async function sendMessage(messageText) {
        const message = messageText.trim();
        if (!message || isSending) {
            return;
        }

        setIsSending(true);
        setError("");
        setInput("");
        setMessages((current) => [...current, { role: "user", content: message, sources: [] }]);

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

    function handleSubmit(event) {
        event.preventDefault();
        void sendMessage(input);
    }

    function toggleSpeechRecognition() {
        if (!speechRef.current) {
            setSpeechError("Tu navegador no soporta dictado por voz en este dispositivo.");
            return;
        }
        if (isListening) {
            speechRef.current.stop();
            return;
        }
        speechRef.current.start();
    }

    async function handleAnalyzeMedia() {
        if (!selectedMedia || isAnalyzingMedia) {
            return;
        }

        setIsAnalyzingMedia(true);
        setError("");
        setMediaResult(null);
        try {
            const formData = new FormData();
            formData.append("file", selectedMedia);
            if (input.trim()) {
                formData.append("question", input.trim());
            }

            const response = await fetch("/api/ai-chat/media", {
                method: "POST",
                body: formData,
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "No se pudo analizar el archivo.");
            }

            const payload = normalizeMediaPayload(result);
            if (!payload) {
                throw new Error("No se recibió un análisis válido del archivo.");
            }

            setMediaResult(payload);
            if (payload.assisted_query) {
                setInput(payload.assisted_query);
            }
            if (payload.assistant_hint) {
                setStatus(payload.assistant_hint);
            }
        } catch (analyzeError) {
            setError(
                analyzeError instanceof Error
                    ? analyzeError.message
                    : "No se pudo analizar el archivo."
            );
        } finally {
            setIsAnalyzingMedia(false);
        }
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
                        <strong>Estado</strong>
                        <p>{helperText}</p>
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
                <div className="actions-row ai-chatbot-input-tools">
                    <button
                        className="button-secondary"
                        onClick={toggleSpeechRecognition}
                        type="button"
                    >
                        {isListening ? "Detener dictado" : "🎤 Dictar pregunta"}
                    </button>
                    {!isSpeechAvailable ? (
                        <span className="pill">Dictado no disponible en este navegador.</span>
                    ) : null}
                </div>
                {speechError ? <p className="ai-chatbot-error">{speechError}</p> : null}

                <div className="field-group">
                    <span>Imagen o video (OCR / soporte visual)</span>
                    <input
                        accept="image/*,video/*"
                        onChange={(event) => {
                            const file = event.target.files?.[0] || null;
                            setSelectedMedia(file);
                            setMediaResult(null);
                        }}
                        type="file"
                    />
                    <div className="actions-row ai-chatbot-input-tools">
                        <button
                            className="button-secondary"
                            disabled={!selectedMedia || isAnalyzingMedia}
                            onClick={() => void handleAnalyzeMedia()}
                            type="button"
                        >
                            {isAnalyzingMedia ? "Analizando archivo…" : "Analizar archivo"}
                        </button>
                        {selectedMedia ? (
                            <span className="pill">
                                {selectedMedia.name} ({formatFileSize(selectedMedia.size)})
                            </span>
                        ) : null}
                    </div>
                </div>

                {mediaResult ? (
                    <div className="support-card ai-chatbot-card">
                        <strong>Resultado visual</strong>
                        <p>{mediaResult.assistant_hint || "Análisis completado."}</p>
                        {mediaResult.extracted_fields ? (
                            <div className="ai-chatbot-sources">
                                {Object.entries(mediaResult.extracted_fields).map(([key, values]) =>
                                    Array.isArray(values) && values.length ? (
                                        <span className="pill" key={key}>
                                            {key.toUpperCase()}: {values.join(", ")}
                                        </span>
                                    ) : null
                                )}
                            </div>
                        ) : null}
                        {Array.isArray(mediaResult.matches) && mediaResult.matches.length ? (
                            <p>
                                Coincidencias:{" "}
                                {mediaResult.matches
                                    .map((item) => item.sku)
                                    .filter(Boolean)
                                    .join(", ")}
                            </p>
                        ) : null}
                    </div>
                ) : null}
                <div className="actions-row">
                    <button className="button-primary" disabled={!canSend} type="submit">
                        {isSending ? "Consultando…" : "Enviar mensaje"}
                    </button>
                    <button
                        className="button-secondary"
                        onClick={() => {
                            setMessages([
                                {
                                    role: "assistant",
                                    content:
                                        "Hola, soy el asistente de Turbobujias Pro. Pregúntame por compatibilidad, SKU, UPC o aplicaciones de bujías y calentadores.",
                                    sources: [],
                                },
                            ]);
                            setHistory([]);
                            setInput("");
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
