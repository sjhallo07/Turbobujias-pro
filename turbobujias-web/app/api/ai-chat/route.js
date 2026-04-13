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

function sanitizeUpstreamError(rawMessage) {
    const lower = typeof rawMessage === "string" ? rawMessage.toLowerCase() : "";
    const isRateLimit = RATE_LIMIT_INDICATORS.some((keyword) => lower.includes(keyword));

    if (isRateLimit) {
        return "El asistente está recibiendo demasiadas solicitudes en este momento. Por favor, espera unos segundos e intenta de nuevo. (The assistant is temporarily busy. Please wait a moment and try again.)";
    }

    return "Lo siento, no pude completar tu solicitud en este momento. Por favor, intenta de nuevo en un momento. (Sorry, I couldn't complete the request right now. Please try again in a moment.)";
}

function looksLikeProviderError(rawMessage) {
    const lower = typeof rawMessage === "string" ? rawMessage.toLowerCase() : "";
    return RATE_LIMIT_INDICATORS.some((keyword) => lower.includes(keyword));
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
            const upstreamDetail =
                result?.error || result?.reply || `Assistant request failed with status ${response.status}.`;
            throw new Error(upstreamDetail);
        }

        const sanitizedResult = result && typeof result === "object" ? { ...result } : result;

        if (sanitizedResult?.reply && looksLikeProviderError(sanitizedResult.reply)) {
            sanitizedResult.reply = sanitizeUpstreamError(sanitizedResult.reply);
            sanitizedResult.sources = [];
        }

        return NextResponse.json({
            data: sanitizedResult ?? null,
        });
    } catch (error) {
        const rawMessage = error instanceof Error ? error.message : String(error);
        console.error("[ai-chat] upstream error (hidden from client):", rawMessage);

        return NextResponse.json(
            {
                error: sanitizeUpstreamError(rawMessage),
            },
            { status: 500 }
        );
    }
}
