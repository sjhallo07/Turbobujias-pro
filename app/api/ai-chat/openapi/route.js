import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPACE_URL =
    process.env.HF_SPACE_URL ||
    process.env.NEXT_PUBLIC_HF_SPACE_URL ||
    "https://sjhallo07-turbobujias-ai.hf.space";
const HF_TOKEN = process.env.HF_TOKEN || "";

export async function GET() {
    try {
        const headers = {};
        if (HF_TOKEN) {
            headers.Authorization = `Bearer ${HF_TOKEN}`;
        }

        const response = await fetch(`${SPACE_URL}/openapi.json`, {
            headers,
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(`OpenAPI request failed with status ${response.status}.`);
        }

        const spec = await response.json();
        return NextResponse.json(spec);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unexpected error while loading the Space OpenAPI spec.",
            },
            { status: 500 }
        );
    }
}
