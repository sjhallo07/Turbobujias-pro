"""
Turbobujias AI Chatbot — Hugging Face Spaces
RAG-based assistant for Diesel/Spark Plug compatibility queries.

Stack:
  - Gradio 4.x  (UI + Voice input via openai-whisper)
  - sentence-transformers/all-MiniLM-L6-v2 (embeddings)
  - faiss-cpu (vector store)
  - mistralai/Mistral-7B-Instruct-v0.2 via HuggingFaceHub (LLM)
"""

import json
import logging
import os
import re
import sys
from pathlib import Path
from typing import Any

import gradio as gr
import requests
import whisper
from dotenv import load_dotenv
from fastapi import FastAPI
from huggingface_hub import InferenceClient
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from openai import OpenAI
from pydantic import BaseModel, Field
import uvicorn

APP_DIR = Path(__file__).parent
ROOT_ENV_PATH = APP_DIR.parent / ".env"
load_dotenv(APP_DIR / ".env")
if ROOT_ENV_PATH.exists():
    load_dotenv(ROOT_ENV_PATH, override=False)

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO").upper())
_log = logging.getLogger(__name__)


def env_int(name: str, default: int) -> int:
    try:
        return int(str(os.environ.get(name, default)).strip())
    except (TypeError, ValueError):
        return default


def env_float(name: str, default: float) -> float:
    try:
        return float(str(os.environ.get(name, default)).strip())
    except (TypeError, ValueError):
        return default


def env_bool(name: str, default: bool = False) -> bool:
    raw = str(os.environ.get(name, default)).strip().lower()
    if raw in {"1", "true", "yes", "on"}:
        return True
    if raw in {"0", "false", "no", "off"}:
        return False
    return default

# ─────────────────────────────────────────────
# 0. Validate required environment variables
# ─────────────────────────────────────────────
HF_TOKEN = (
    os.environ.get("HF_TOKEN", "").strip()
    or os.environ.get("HUGGINGFACEHUB_API_TOKEN", "").strip()
)
HF_MODEL_REPO_ID = os.environ.get(
    "HF_MODEL_REPO_ID",
    "mistralai/Mistral-7B-Instruct-v0.2",
).strip()
GITHUB_TOKEN = (
    os.environ.get("GITHUB_TOKEN", "").strip()
    or os.environ.get("GITHUB_MODELS_TOKEN", "").strip()
)
GITHUB_MODELS_MODEL = os.environ.get(
    "GITHUB_MODELS_MODEL",
    "openai/gpt-4o",
).strip()
GITHUB_MODELS_ORG = os.environ.get("GITHUB_MODELS_ORG", "").strip()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash-lite").strip()
GEMINI_API_BASE_URL = os.environ.get(
    "GEMINI_API_BASE_URL",
    "https://generativelanguage.googleapis.com/v1beta",
).strip().rstrip("/")
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "").strip().lower()
GEMINI_FALLBACK_ENABLED = env_bool("GEMINI_FALLBACK_ENABLED", True)
GITHUB_TIMEOUT_SECONDS = env_float("GITHUB_TIMEOUT_SECONDS", 10.0)
GITHUB_MAX_TOKENS = env_int("GITHUB_MAX_TOKENS", 600)
HF_MAX_NEW_TOKENS = env_int("HF_MAX_NEW_TOKENS", 384)
HF_TIMEOUT_SECONDS = env_float("HF_TIMEOUT_SECONDS", 20.0)
GEMINI_TIMEOUT_SECONDS = env_float("GEMINI_TIMEOUT_SECONDS", 12.0)
GEMINI_TEMPERATURE = env_float("GEMINI_TEMPERATURE", 0.2)
GEMINI_TOP_P = env_float("GEMINI_TOP_P", 0.9)
GEMINI_MAX_OUTPUT_TOKENS = env_int("GEMINI_MAX_OUTPUT_TOKENS", 384)

configured_providers = {
    "github": bool(GITHUB_TOKEN),
    "huggingface": bool(HF_TOKEN),
    "gemini": bool(GEMINI_API_KEY),
}

if not LLM_PROVIDER:
    for provider_name in ("github", "gemini", "huggingface"):
        if configured_providers[provider_name]:
            LLM_PROVIDER = provider_name
            break

if LLM_PROVIDER not in {"github", "huggingface", "gemini"}:
    print(
        "ERROR: LLM_PROVIDER must be one of 'github', 'huggingface', or 'gemini'.",
        file=sys.stderr,
    )
    sys.exit(1)

if not any(configured_providers.values()):
    print(
        "ERROR: No LLM credentials configured. Provide at least one of GITHUB_TOKEN, "
        "GEMINI_API_KEY, or HF_TOKEN.",
        file=sys.stderr,
    )
    sys.exit(1)

if LLM_PROVIDER == "huggingface" and not HF_TOKEN:
    print(
        "ERROR: HF_TOKEN environment variable is not set. "
        "Set it to a Hugging Face API token with inference permissions "
        "(required for the Mistral-7B-Instruct model). "
        "On Hugging Face Spaces add it as a Space Secret named HF_TOKEN "
        "or HUGGINGFACEHUB_API_TOKEN.",
        file=sys.stderr,
    )
    sys.exit(1)

if LLM_PROVIDER == "gemini" and not GEMINI_API_KEY:
    print(
        "ERROR: GEMINI_API_KEY environment variable is not set. "
        "Add a Google Gemini API key or choose another provider.",
        file=sys.stderr,
    )
    sys.exit(1)

if LLM_PROVIDER == "github" and not GITHUB_TOKEN and not (
    GEMINI_FALLBACK_ENABLED and GEMINI_API_KEY
):
    print(
        "ERROR: GITHUB_TOKEN environment variable is not set. "
        "Add a GitHub personal access token with models:read permission or configure GEMINI_API_KEY for fallback.",
        file=sys.stderr,
    )
    sys.exit(1)

if LLM_PROVIDER == "github" and not GITHUB_TOKEN and GEMINI_FALLBACK_ENABLED and GEMINI_API_KEY:
    _log.warning(
        "LLM_PROVIDER=github but GITHUB_TOKEN is missing; the chatbot will use Gemini fallback."
    )

# ─────────────────────────────────────────────
# 1. Load inventory data
# ─────────────────────────────────────────────
SYSTEM_PROMPT = (
    "You are Turbobujias AI Assistant, a specialist in spark plugs, glow plugs, diesel parts, "
    "SKU/UPC matching, and vehicle compatibility for the Venezuelan market. "
    "Use the catalog context as the primary source of truth. "
    "Before answering, silently self-check for contradictions, missing fitment details, and invented part numbers. "
    "If the catalog is insufficient or the application is ambiguous, say so clearly and ask for the minimum follow-up details needed, "
    "such as brand, model, engine, fuel type, or year. "
    "Prefer concise, practical answers with exact SKU references when available, short comparisons when useful, and a brief note about uncertainty when needed."
)

INVENTORY_PATH = APP_DIR / "inventory.json"

if not INVENTORY_PATH.exists():
    print(
        f"ERROR: inventory file not found at {INVENTORY_PATH}. "
        "Make sure inventory.json is included in the deployment bundle.",
        file=sys.stderr,
    )
    sys.exit(1)

def load_inventory() -> list[Document]:
    """Convert inventory.json items into LangChain Documents."""
    with open(INVENTORY_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    docs = []
    for item in data.get("items", []):
        applications = "; ".join(item.get("application", []))
        text = (
            f"SKU: {item['sku']} | UPC: {item.get('upc', 'N/A')} | "
            f"Brand: {item['brand']} | Model: {item['model']} | "
            f"Type: {item['type']} | Thread: {item.get('thread', 'N/A')} | "
            f"Gap: {item.get('gap_mm', 'N/A')} mm | "
            f"Electrode: {item.get('electrode', 'N/A')} | "
            f"Price USD: ${item['price_usd']} | "
            f"Applications: {applications}"
        )
        docs.append(
            Document(
                page_content=text,
                metadata={
                    "sku": item["sku"],
                    "upc": str(item.get("upc", "")).strip(),
                    "brand": item.get("brand", ""),
                    "model": item.get("model", ""),
                },
            )
        )
    return docs


def load_inventory_items() -> list[dict[str, Any]]:
    with open(INVENTORY_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("items", [])


def extract_doc_field(doc: Document, field_name: str) -> str:
    pattern = rf"{field_name}:\s*([^|]+)"
    match = re.search(pattern, doc.page_content)
    return match.group(1).strip() if match else ""


def find_exact_catalog_matches(query: str) -> list[Document]:
    normalized = query.casefold()
    digit_tokens = set(re.findall(r"\b\d{8,14}\b", query))
    sku_candidates = set(re.findall(r"\b[A-Z0-9]+(?:-[A-Z0-9]+)+\b", query.upper()))

    matches: list[Document] = []
    seen: set[str] = set()

    for doc in documents:
        sku = str(doc.metadata.get("sku", "")).strip()
        upc = str(doc.metadata.get("upc", "")).strip()
        sku_upper = sku.upper()

        is_match = False
        if sku and sku_upper in sku_candidates:
            is_match = True
        elif upc and upc in digit_tokens:
            is_match = True
        elif sku and sku.casefold() in normalized:
            is_match = True

        if is_match and sku not in seen:
            seen.add(sku)
            matches.append(doc)

    return matches


def get_relevant_docs(query: str) -> list[Document]:
    exact_docs = find_exact_catalog_matches(query)
    semantic_docs = retriever.invoke(query)
    merged: list[Document] = []
    seen: set[str] = set()

    for doc in [*exact_docs, *semantic_docs]:
        sku = str(doc.metadata.get("sku", "")).strip() or doc.page_content
        if sku in seen:
            continue
        seen.add(sku)
        merged.append(doc)

    return merged[:4]


def collect_source_skus(query: str, answer: str, docs: list[Document]) -> list[str]:
    query_text = query.casefold()
    answer_text = answer.casefold()
    brand_match = re.search(r"\b(ngk|bosch|denso|champion|beru|motorcraft|acdelco|autolite)\b", query_text)
    requested_brand = brand_match.group(1) if brand_match else ""

    ranked: list[tuple[int, int, str]] = []
    seen: set[str] = set()

    for index, doc in enumerate(docs):
        sku = str(doc.metadata.get("sku", "")).strip()
        if not sku or sku in seen:
            continue

        seen.add(sku)
        sku_text = sku.casefold()
        brand = extract_doc_field(doc, "Brand").casefold()
        model = extract_doc_field(doc, "Model").casefold()

        score = 0
        if sku_text in answer_text:
            score += 100
        if sku_text in query_text:
            score += 60
        if requested_brand and brand == requested_brand:
            score += 40
        if brand and brand in answer_text:
            score += 25
        if brand and brand in query_text:
            score += 15
        if model and model in answer_text:
            score += 15
        if model and model in query_text:
            score += 10

        ranked.append((score, -index, sku))

    ranked.sort(reverse=True)
    ordered = [sku for _score, _index, sku in ranked]
    return ordered[:3]


def is_exact_lookup_query(query: str) -> bool:
    lowered = query.casefold()
    has_code = bool(re.search(r"\b\d{8,14}\b", query)) or bool(
        re.search(r"\b[A-Z0-9]+(?:-[A-Z0-9]+)+\b", query.upper())
    )
    lookup_terms = any(
        term in lowered
        for term in ["sku", "upc", "ean", "barcode", "lookup", "match", "matches", "which product", "what product"]
    )
    explanation_terms = any(
        term in lowered
        for term in ["explain", "definition", "what is", "machine learning", "llm", "compare", "difference", "using examples"]
    )

    if explanation_terms:
        return False

    return has_code and lookup_terms


def find_exact_inventory_item(query: str) -> dict[str, Any] | None:
    sku_candidates = set(re.findall(r"\b[A-Z0-9]+(?:-[A-Z0-9]+)+\b", query.upper()))
    digit_tokens = set(re.findall(r"\b\d{8,14}\b", query))
    normalized = query.casefold()

    for item in inventory_items:
        sku = str(item.get("sku", "")).strip().upper()
        upc = str(item.get("upc", "")).strip()

        if sku and sku in sku_candidates:
            return item
        if upc and upc in digit_tokens:
            return item
        if sku and sku.casefold() in normalized:
            return item

    return None


def build_exact_lookup_answer(item: dict[str, Any]) -> str:
    sku = str(item.get("sku", "")).strip()
    upc = str(item.get("upc", "")).strip()
    brand = str(item.get("brand", "")).strip()
    model = str(item.get("model", "")).strip()
    raw_type = str(item.get("type", "")).strip()
    part_type = "Calentador" if raw_type == "diesel_glow_plug" else "Bujía"
    thread = str(item.get("thread", "")).strip()
    gap_value = item.get("gap_mm", "")
    gap = f"{gap_value} mm" if gap_value != "" else "N/A"
    electrode = str(item.get("electrode", item.get("voltage", "N/A"))).strip()
    price = f"${item.get('price_usd', 'N/A')} USD"
    applications = item.get("application", [])

    application_lines = []
    if applications:
        application_lines = [
            f"  - {str(application).strip()}"
            for application in applications
            if str(application).strip()
        ]

    answer_lines = [
        f"El producto que corresponde a **{sku}** es:",
        "",
        f"- **Marca:** {brand}",
        f"- **Modelo:** {model}",
        f"- **UPC:** {upc or 'N/A'}",
        f"- **Tipo:** {part_type or 'N/A'}",
        f"- **Rosca:** {thread or 'N/A'}",
        f"- **Separación:** {gap or 'N/A'}",
        f"- **Electrodo:** {electrode or 'N/A'}",
        f"- **Precio:** {price or 'N/A'}",
    ]

    if application_lines:
        answer_lines.extend(["- **Aplicaciones:**", *application_lines])

    answer_lines.append("")
    answer_lines.append(
        "Si quieres, también puedo ayudarte a confirmar compatibilidad por marca, modelo, motor, combustible y año."
    )

    return "\n".join(answer_lines)


def try_exact_lookup_answer(query: str, docs: list[Document]) -> tuple[str, list[str]] | None:
    if not is_exact_lookup_query(query):
        return None

    exact_item = find_exact_inventory_item(query)
    if exact_item is None:
        return None

    sku = str(exact_item.get("sku", "")).strip()
    if not sku:
        return None

    answer = build_exact_lookup_answer(exact_item)
    sources = [sku]
    return answer, sources


# ─────────────────────────────────────────────
# 2. Build FAISS vector store
# ─────────────────────────────────────────────
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

print("Loading embeddings model…")
embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)

print("Building FAISS index from inventory…")
inventory_items = load_inventory_items()
documents = load_inventory()
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(documents)
vectorstore = FAISS.from_documents(chunks, embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

# ─────────────────────────────────────────────
# 3. Set up LLM (Mistral-7B via HuggingFaceHub)
# ─────────────────────────────────────────────
github_client = None
huggingface_client = None

if HF_TOKEN:
    huggingface_client = InferenceClient(api_key=HF_TOKEN)

if GITHUB_TOKEN:
    github_client = OpenAI(
        base_url=(
            f"https://models.github.ai/orgs/{GITHUB_MODELS_ORG}/inference"
            if GITHUB_MODELS_ORG
            else "https://models.github.ai/inference"
        ),
        api_key=GITHUB_TOKEN,
        timeout=GITHUB_TIMEOUT_SECONDS,
        max_retries=0,
    )

# ─────────────────────────────────────────────
# 4. Whisper model for voice transcription
# ─────────────────────────────────────────────
print("Loading Whisper model…")
whisper_model = whisper.load_model("base")


# ─────────────────────────────────────────────
# 5. Helper functions
# ─────────────────────────────────────────────
PROVIDER_ERROR_HINTS = frozenset(
    {
        "rate limit",
        "ratelimit",
        "too many requests",
        "429",
        "terms of service",
        "terms-of-service",
        "scraping",
        "quota",
        "service unavailable",
        "timed out",
        "timeout",
        "temporarily unavailable",
        "resource exhausted",
    }
)


def is_provider_error(exc: Exception) -> bool:
    if isinstance(exc, requests.RequestException):
        return True

    message = str(exc).lower()
    return any(hint in message for hint in PROVIDER_ERROR_HINTS)


def safe_llm_error_message(exc: Exception) -> str:
    _log.warning("Chatbot provider failure hidden from user: %s", exc, exc_info=True)
    if is_provider_error(exc):
        return (
            "El asistente está temporalmente ocupado en este momento. "
            "Por favor, intenta de nuevo en unos segundos.\n"
            "(The assistant is temporarily busy right now. Please try again in a few seconds.)"
        )

    return (
        "Lo siento, no pude completar tu solicitud en este momento. "
        "Por favor, intenta de nuevo en un momento.\n"
        "(Sorry, I couldn't complete your request right now. Please try again shortly.)"
    )


def get_provider_execution_order() -> list[str]:
    preferred_order = {
        "github": ["github", "gemini", "huggingface"],
        "gemini": ["gemini", "github", "huggingface"],
        "huggingface": ["huggingface", "gemini", "github"],
    }

    order: list[str] = []
    for provider_name in preferred_order.get(LLM_PROVIDER, [LLM_PROVIDER]):
        if provider_name == "github" and not GITHUB_TOKEN:
            continue
        if provider_name == "gemini" and (not GEMINI_FALLBACK_ENABLED or not GEMINI_API_KEY):
            continue
        if provider_name == "huggingface" and not HF_TOKEN:
            continue
        if provider_name not in order:
            order.append(provider_name)

    return order


def build_github_messages(
    query: str,
    docs: list[Document],
    history: list[tuple[str, str]] | None = None,
) -> list[dict[str, str]]:
    context = "\n\n".join(doc.page_content for doc in docs)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    for previous_user, previous_assistant in (history or [])[-4:]:
        if previous_user:
            messages.append({"role": "user", "content": previous_user})
        if previous_assistant:
            messages.append({"role": "assistant", "content": previous_assistant})

    messages.append(
        {
            "role": "user",
            "content": (
                f"Catalog context:\n{context}\n\n"
                f"Customer question: {query}\n\n"
                "Respond in the same language as the customer when possible."
            ),
        }
    )

    return messages


def build_huggingface_prompt(
    query: str,
    docs: list[Document],
    history: list[tuple[str, str]] | None = None,
) -> str:
    context = "\n\n".join(doc.page_content for doc in docs)
    history_lines = []
    for previous_user, previous_assistant in (history or [])[-4:]:
        if previous_user:
            history_lines.append(f"User: {previous_user}")
        if previous_assistant:
            history_lines.append(f"Assistant: {previous_assistant}")

    conversation_context = "\n".join(history_lines).strip() or "No previous conversation."
    return (
        f"{SYSTEM_PROMPT}\n\n"
        "System rules:\n"
        "- Use only the catalog context as authoritative evidence.\n"
        "- Do not invent fitments, gap values, thread sizes, or part numbers.\n"
        "- If the request is ambiguous, ask a short clarifying question.\n"
        "- If multiple SKUs might fit, explain the difference briefly.\n"
        "- Perform a silent self-check before answering to ensure the response is grounded in the catalog context.\n\n"
        f"Recent conversation:\n{conversation_context}\n\n"
        f"Catalog context:\n{context}\n\n"
        f"Customer question:\n{query}\n\n"
        "Answer in the customer's language when possible and keep the response practical."
    )


def extract_gemini_text(payload: dict[str, Any]) -> str:
    for candidate in payload.get("candidates", []):
        content = candidate.get("content", {})
        parts = content.get("parts", [])
        text_parts = [str(part.get("text", "")).strip() for part in parts if part.get("text")]
        answer = "\n".join(part for part in text_parts if part).strip()
        if answer:
            return answer

    raise RuntimeError("Gemini returned no text candidates.")


def answer_with_github_models(
    query: str,
    history: list[tuple[str, str]] | None = None,
    docs: list[Document] | None = None,
) -> tuple[str, list[str]]:
    if github_client is None:
        raise RuntimeError("GitHub Models client is not configured.")

    docs = docs or get_relevant_docs(query)
    exact_lookup = try_exact_lookup_answer(query, docs)
    if exact_lookup is not None:
        return exact_lookup

    messages = build_github_messages(query, docs, history)

    response = github_client.chat.completions.create(
        messages=messages,
        temperature=0.2,
        top_p=1.0,
        max_tokens=GITHUB_MAX_TOKENS,
        model=GITHUB_MODELS_MODEL,
    )

    answer = (response.choices[0].message.content or "").strip()
    sources = collect_source_skus(query, answer, docs)
    return answer, sources


def answer_with_huggingface(
    query: str,
    history: list[tuple[str, str]] | None = None,
    docs: list[Document] | None = None,
) -> tuple[str, list[str]]:
    if huggingface_client is None:
        raise RuntimeError("Hugging Face LLM is not configured.")

    docs = docs or get_relevant_docs(query)
    exact_lookup = try_exact_lookup_answer(query, docs)
    if exact_lookup is not None:
        return exact_lookup

    prompt = build_huggingface_prompt(query, docs, history)
    answer = str(
        huggingface_client.text_generation(
            prompt,
            model=HF_MODEL_REPO_ID,
            max_new_tokens=HF_MAX_NEW_TOKENS,
            temperature=0.2,
            top_p=0.9,
            do_sample=True,
            return_full_text=False,
        )
    ).strip()
    sources = collect_source_skus(query, answer, docs)
    return answer, sources


def answer_with_gemini(
    query: str,
    history: list[tuple[str, str]] | None = None,
    docs: list[Document] | None = None,
) -> tuple[str, list[str]]:
    if not GEMINI_API_KEY:
        raise RuntimeError("Gemini is not configured.")

    docs = docs or get_relevant_docs(query)
    exact_lookup = try_exact_lookup_answer(query, docs)
    if exact_lookup is not None:
        return exact_lookup

    contents: list[dict[str, Any]] = []
    for previous_user, previous_assistant in (history or [])[-4:]:
        if previous_user:
            contents.append({"role": "user", "parts": [{"text": previous_user}]})
        if previous_assistant:
            contents.append({"role": "model", "parts": [{"text": previous_assistant}]})

    context = "\n\n".join(doc.page_content for doc in docs)
    contents.append(
        {
            "role": "user",
            "parts": [
                {
                    "text": (
                        f"Catalog context:\n{context}\n\n"
                        f"Customer question: {query}\n\n"
                        "Respond in the same language as the customer when possible."
                    )
                }
            ],
        }
    )

    payload = {
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": contents,
        "generationConfig": {
            "temperature": GEMINI_TEMPERATURE,
            "topP": GEMINI_TOP_P,
            "maxOutputTokens": GEMINI_MAX_OUTPUT_TOKENS,
        },
    }
    response = requests.post(
        f"{GEMINI_API_BASE_URL}/models/{GEMINI_MODEL}:generateContent",
        headers={
            "Content-Type": "application/json",
            "X-goog-api-key": GEMINI_API_KEY,
        },
        json=payload,
        timeout=GEMINI_TIMEOUT_SECONDS,
    )

    if not response.ok:
        try:
            error_payload = response.json()
            error_message = error_payload.get("error", {}).get("message", "")
        except ValueError:
            error_message = response.text
        raise RuntimeError(error_message or f"Gemini request failed with status {response.status_code}.")

    answer = extract_gemini_text(response.json())
    sources = collect_source_skus(query, answer, docs)
    return answer, sources


def answer_query(
    query: str,
    history: list[tuple[str, str]] | None = None,
) -> tuple[str, list[str]]:
    docs = get_relevant_docs(query)
    exact_lookup = try_exact_lookup_answer(query, docs)
    if exact_lookup is not None:
        return exact_lookup

    handlers = {
        "github": answer_with_github_models,
        "huggingface": answer_with_huggingface,
        "gemini": answer_with_gemini,
    }
    provider_order = get_provider_execution_order()
    last_error: Exception | None = None

    for provider_name in provider_order:
        handler = handlers[provider_name]
        try:
            _log.info("Answering query with provider=%s", provider_name)
            return handler(query, history=history, docs=docs)
        except Exception as exc:
            last_error = exc
            _log.warning("Provider %s failed, trying next fallback if available: %s", provider_name, exc)

    if last_error is not None:
        raise last_error

    raise RuntimeError("No LLM provider is available to answer the query.")


def serialize_history(history: list[tuple[str, str]]) -> list[dict[str, str]]:
    """Convert Gradio chat history tuples into a JSON-safe structure."""
    serialized = []
    for user_message, assistant_message in history:
      serialized.append(
          {
              "user": str(user_message),
              "assistant": str(assistant_message),
          }
      )
    return serialized


def normalize_history(history: list[dict[str, str]] | None) -> list[tuple[str, str]]:
    """Convert API history objects into the tuple format used by Gradio Chatbot."""
    if not history:
        return []

    normalized = []
    for item in history:
        if not isinstance(item, dict):
            continue

        user_message = str(item.get("user", "")).strip()
        assistant_message = str(item.get("assistant", "")).strip()
        if not user_message and not assistant_message:
            continue

        normalized.append((user_message, assistant_message))

    return normalized


def chat_api(message: str, history: list[dict[str, str]] | None = None) -> dict[str, object]:
    """Chat endpoint for web clients that need structured responses.

    Args:
        message: User message in Spanish or English.
        history: Previous conversation messages as objects with user and assistant keys.

    Returns:
        A JSON-safe payload containing the assistant reply, cited source SKUs, and updated history.
    """
    current_history = normalize_history(history)

    if not message.strip():
        return {
            "reply": "",
            "sources": [],
            "history": serialize_history(current_history),
        }

    try:
        answer, sources = answer_query(message, current_history)
    except Exception as exc:
        answer = safe_llm_error_message(exc)
        sources = []

    updated_history = current_history + [(message, answer)]
    return {
        "reply": answer,
        "sources": sources,
        "history": serialize_history(updated_history),
    }


class ChatTurn(BaseModel):
    user: str = ""
    assistant: str = ""


class ChatRequest(BaseModel):
    message: str = ""
    history: list[ChatTurn] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    sources: list[str] = Field(default_factory=list)
    history: list[ChatTurn] = Field(default_factory=list)


api_app = FastAPI(
    title="Turbobujias AI Assistant API",
    description="Local REST API for the Turbobujias AI chatbot.",
    version="1.0.0",
)


@api_app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@api_app.post("/chat", response_model=ChatResponse)
def chat_endpoint(payload: ChatRequest) -> ChatResponse:
    result = chat_api(
        payload.message,
        history=[turn.model_dump() for turn in payload.history],
    )
    return ChatResponse(
        reply=str(result.get("reply", "")),
        sources=list(result.get("sources", [])),
        history=[ChatTurn(**item) for item in result.get("history", []) if isinstance(item, dict)],
    )


def answer_text(query: str, history: list) -> tuple[str, list, list]:
    """Process a text query and return (cleared_input, updated_chatbot, updated_state)."""
    if not query.strip():
        return "", history, history
    try:
        answer, sources = answer_query(query, history)
    except Exception as exc:
        answer = safe_llm_error_message(exc)
        sources = []
    if sources:
        answer += f"\n\n*Sources: {', '.join(sources)}*"
    updated_history = history + [(query, answer)]
    return "", updated_history, updated_history


def answer_voice(audio_path: str | None, history: list) -> tuple[list, list]:
    """Transcribe voice input with Whisper then run QA.

    Returns (updated_chatbot, updated_state).
    """
    if audio_path is None:
        return history, history
    try:
        transcription = whisper_model.transcribe(audio_path)["text"]
    except Exception as exc:
        _log.warning("Whisper transcription error hidden from user: %s", exc, exc_info=True)
        error_message = (
            "Lo siento, no pude transcribir ese audio en este momento. "
            "Por favor, intenta de nuevo con una grabación más corta o más clara.\n"
            "(Sorry, I couldn't transcribe that audio right now. Please try again with a shorter or clearer recording.)"
        )
        updated_history = history + [(
            "[voice input]",
            error_message,
        )]
        return updated_history, updated_history

    _, updated_history, updated_state = answer_text(transcription, history)
    return updated_history, updated_state


# ─────────────────────────────────────────────
# 6. Gradio UI
# ─────────────────────────────────────────────
with gr.Blocks(title="Turbobujias AI Assistant", theme=gr.themes.Soft()) as demo:
    gr.Markdown(
        """
        # 🔧 Turbobujias AI Assistant
        Ask compatibility questions about **Diesel and Spark Plugs** in English or Spanish.
        Uses **GitHub Models** first when available and can fail over to **Gemini Flash Lite** automatically.
        > *¿Qué bujía necesita un Toyota Hilux 2018 diesel?*
        > *Which spark plug fits a Honda Civic 1.6L 1998?*
        """
    )

    chatbot = gr.Chatbot(label="Chat", height=450)
    state = gr.State([])

    with gr.Row():
        txt_input = gr.Textbox(
            placeholder="Type your question…",
            label="Text query",
            scale=4,
        )
        send_btn = gr.Button("Send", variant="primary", scale=1)

    with gr.Accordion("🎤 Voice input (Whisper)", open=False):
        audio_input = gr.Audio(type="filepath", label="Record your question")
        voice_btn = gr.Button("Transcribe & Ask")

    # Text events — state is both an input (existing history) and an output
    # (updated history), so chat is correctly accumulated across turns.
    send_btn.click(
        answer_text,
        inputs=[txt_input, state],
        outputs=[txt_input, chatbot, state],
    )
    txt_input.submit(
        answer_text,
        inputs=[txt_input, state],
        outputs=[txt_input, chatbot, state],
    )

    # Voice events — same state wiring as text path
    voice_btn.click(
        answer_voice,
        inputs=[audio_input, state],
        outputs=[chatbot, state],
    )

    gr.Markdown(
        "---\n*Powered by [Hugging Face](https://huggingface.co) · "
        "Data sourced from the Turbobujias3646 inventory*"
    )


app = gr.mount_gradio_app(api_app, demo, path="/")

if __name__ == "__main__":
    demo.queue(default_concurrency_limit=2)
    uvicorn.run(
        app,
        host=os.environ.get("GRADIO_SERVER_NAME", "127.0.0.1"),
        port=int(os.environ.get("PORT", os.environ.get("GRADIO_SERVER_PORT", "7860"))),
    )

