import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPACE_URL =
    process.env.HF_SPACE_URL ||
    process.env.NEXT_PUBLIC_HF_SPACE_URL ||
    "https://sjhallo07-turbobujias-ai.hf.space";
const MEDIA_API_NAME =
    process.env.HF_MEDIA_API_NAME || process.env.NEXT_PUBLIC_HF_MEDIA_API_NAME || "/analyze-media";
const HF_TOKEN = process.env.HF_TOKEN || "";

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");
        const question = formData.get("question");

        if (!(file instanceof File)) {
            return NextResponse.json(
                { error: "Debes adjuntar una imagen o video para analizar." },
                { status: 400 }
            );
        }

        const upstreamForm = new FormData();
        upstreamForm.append("file", file, file.name || "upload");
        if (typeof question === "string" && question.trim()) {
            upstreamForm.append("question", question.trim());
        }

        const headers = {};
        if (HF_TOKEN) {
            headers.Authorization = `Bearer ${HF_TOKEN}`;
        }

        const response = await fetch(`${SPACE_URL}${MEDIA_API_NAME}`, {
            method: "POST",
            headers,
            body: upstreamForm,
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result?.detail || result?.error || "No se pudo analizar el archivo.");
        }

        return NextResponse.json({ data: result });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "No se pudo analizar el archivo en este momento.",
            },
            { status: 500 }
        );
    }
}
