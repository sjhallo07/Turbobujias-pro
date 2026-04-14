import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPACE_URL =
    process.env.HF_SPACE_URL ||
    process.env.NEXT_PUBLIC_HF_SPACE_URL ||
    "https://sjhallo07-turbobujias-ai.hf.space";
const CHAT_API_NAME =
    process.env.HF_CHAT_API_NAME || process.env.NEXT_PUBLIC_HF_CHAT_API_NAME || "/chat";
const HF_TOKEN = process.env.HF_TOKEN || "";
const OPENAPI_PATH = "/openapi.json";

/**
 * Keywords that indicate a provider-level rate-limit or policy error.
 * When any of these appear in the upstream error message the proxy replaces
 * the raw text with a safe, user-friendly message so end users never see
 * GitHub Terms-of-Service or scraping-policy wording.
 */
const RATE_LIMIT_INDICATORS = [
    "rate limit",
    "ratelimit",
    "too many requests",
    "429",
    "terms of service",
    "terms-of-service",
    "scraping",
    "github terms",
    "quota",
];

function sanitizeUpstreamError(raw) {
    const lower = typeof raw === "string" ? raw.toLowerCase() : "";
    const isRateLimit = RATE_LIMIT_INDICATORS.some((kw) => lower.includes(kw));
    if (isRateLimit) {
        return "El asistente está recibiendo demasiadas solicitudes en este momento. Por favor, espera unos segundos e intenta de nuevo. (The assistant is temporarily busy. Please wait a moment and try again.)";
    }
    // For any other upstream error avoid forwarding internal detail; return a
    // generic user-facing message instead.
    return "Lo siento, no pude completar tu solicitud en este momento. Por favor, intenta de nuevo en un momento. (Sorry, I couldn't complete the request right now. Please try again in a moment.)";
}

function buildSpaceEndpointMetadata() {
    const apiBaseUrl = SPACE_URL;

    return {
        spaceUrl: SPACE_URL,
        apiName: CHAT_API_NAME,
        apiBaseUrl,
        openApiUrl: `${SPACE_URL}${OPENAPI_PATH}`,
        chatUrl: `${SPACE_URL}${CHAT_API_NAME}`,
        localProxyUrl: "/api/ai-chat",
        localOpenApiProxyUrl: "/api/ai-chat/openapi",
    };
}

export async function GET() {
    try {
        const headers = {};
        if (HF_TOKEN) {
            headers.Authorization = `Bearer ${HF_TOKEN}`;
        }

        const response = await fetch(`${SPACE_URL}${OPENAPI_PATH}`, {
            headers,
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(`OpenAPI request failed with status ${response.status}.`);
        }

        const openapi = await response.json();

        return NextResponse.json({
            endpoints: buildSpaceEndpointMetadata(),
            tokenConfigured: Boolean(HF_TOKEN),
            openapi,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unexpected error while loading Space endpoint metadata.",
                endpoints: buildSpaceEndpointMetadata(),
            },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const message = typeof body.message === "string" ? body.message.trim() : "";
        const history = Array.isArray(body.history) ? body.history : [];

        if (!message) {
            return NextResponse.json(
                { error: "The message field is required." },
                { status: 400 }
            );
        }

        const headers = {
            "Content-Type": "application/json",
        };
        if (HF_TOKEN) {
            headers.Authorization = `Bearer ${HF_TOKEN}`;
        }

        const response = await fetch(`${SPACE_URL}${CHAT_API_NAME}`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                message,
                history,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            // Use the upstream reply/error text for sanitization, but never
            // forward raw provider or rate-limit error text to the browser.
            const upstreamDetail = result.error || result.reply || `Assistant request failed with status ${response.status}.`;
            throw new Error(upstreamDetail);
        }

        return NextResponse.json({
            data: result ?? null,
        });
    } catch (error) {
        const rawMessage = error instanceof Error ? error.message : String(error);
        // Log the original error server-side so it remains visible in server logs
        // without being sent to the browser.
        console.error("[ai-chat] upstream error (hidden from client):", rawMessage);
        return NextResponse.json(
            {
                error: sanitizeUpstreamError(rawMessage),
            },
            { status: 500 }
        );
    }
}
