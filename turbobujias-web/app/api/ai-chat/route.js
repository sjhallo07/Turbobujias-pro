import { NextResponse } from "next/server";
import { client as createGradioClient } from "@gradio/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPACE_URL =
    process.env.HF_SPACE_URL ||
    process.env.NEXT_PUBLIC_HF_SPACE_URL ||
    "https://sjhallo07-turbobujias-ai.hf.space";
const CHAT_API_NAME =
    process.env.HF_CHAT_API_NAME || process.env.NEXT_PUBLIC_HF_CHAT_API_NAME || "/chat";
const HF_TOKEN = process.env.HF_TOKEN || "";
const OPENAPI_PATH = "/gradio_api/openapi.json";

let clientPromise;

function normalizeApiName(apiName) {
    return String(apiName || "").replace(/^\//, "") || "predict";
}

function buildSpaceEndpointMetadata() {
    const normalizedApiName = normalizeApiName(CHAT_API_NAME);
    const apiBaseUrl = `${SPACE_URL}/gradio_api`;

    return {
        spaceUrl: SPACE_URL,
        apiName: CHAT_API_NAME,
        apiBaseUrl,
        openApiUrl: `${SPACE_URL}${OPENAPI_PATH}`,
        queueSubmitUrl: `${apiBaseUrl}/call/${normalizedApiName}`,
        queueResultUrlTemplate: `${apiBaseUrl}/call/${normalizedApiName}/{event_id}`,
        localProxyUrl: "/api/ai-chat",
        localOpenApiProxyUrl: "/api/ai-chat/openapi",
    };
}

async function getClient() {
    if (!clientPromise) {
        clientPromise = createGradioClient(SPACE_URL, HF_TOKEN ? { hf_token: HF_TOKEN } : {});
    }
    return clientPromise;
}


export async function GET() {
    try {
        const app = await getClient();
        const viewApi = await app.view_api();

        return NextResponse.json({
            endpoints: buildSpaceEndpointMetadata(),
            tokenConfigured: Boolean(HF_TOKEN),
            viewApi,
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

        const app = await getClient();
        const result = await app.predict(CHAT_API_NAME, {
            message,
            history,
        });

        return NextResponse.json({
            data: result?.data ?? result ?? null,
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
