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
            throw new Error(result.error || `Assistant request failed with status ${response.status}.`);
        }

        return NextResponse.json({
            data: result ?? null,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unexpected error while querying the Gradio assistant.",
            },
            { status: 500 }
        );
    }
}
