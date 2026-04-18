"""
Turbobujias AI Chatbot — Hugging Face Spaces
RAG-based assistant for Diesel/Spark Plug compatibility queries.

Stack:
  - Gradio 4.x  (UI + Voice input via openai-whisper)
  - sentence-transformers/all-MiniLM-L6-v2 (embeddings)
  - faiss-cpu (vector store)
  - mistralai/Mistral-7B-Instruct-v0.2 via HuggingFaceHub (LLM)
"""

import base64
import json
import importlib
import logging
import os
import re
import sys
import time
from pathlib import Path
from typing import Any, cast

import gradio as gr
import requests
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

try:
    whisper = cast(Any, importlib.import_module("whisper"))
except ImportError:
    whisper = None

logging.basicConfig(level=logging.INFO)
_log = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Provider-error helpers
# ─────────────────────────────────────────────
# Keywords that indicate a provider-side rate-limit, policy, or quota error.
# These are matched case-insensitively against the stringified exception.
_RATE_LIMIT_INDICATORS: frozenset[str] = frozenset(
    [
        "rate limit",
        "ratelimit",
        "too many requests",
        "429",
        "terms of service",
        "terms-of-service",
        "scraping",
        "github.com/site-policy",
        "github terms",
        "quota",
        "exceeded",
    ]
)

# Seconds to wait before the 2nd and 3rd attempts when GitHub Models is rate-limited.
_RETRY_WAIT_SECONDS: tuple[float, float] = (1.5, 4.0)


def _is_rate_limit_or_provider_error(exc: Exception) -> bool:
    """Return True when *exc* looks like a provider rate-limit or policy error."""
    msg = str(exc).lower()
    return any(indicator in msg for indicator in _RATE_LIMIT_INDICATORS)


def _safe_llm_error_message(exc: Exception) -> str:
    """Log the real error server-side and return a user-friendly message that never
    exposes raw provider error text, rate-limit details, or Terms-of-Service references."""
    _log.warning("LLM error (hidden from chat UI): %s", exc, exc_info=True)
    if _is_rate_limit_or_provider_error(exc):
        return (
            "El asistente está recibiendo demasiadas solicitudes en este momento. "
            "Por favor, espera unos segundos e intenta de nuevo.\n"
            "(The assistant is temporarily busy. Please wait a moment and try again.)"
        )
    return (
        "Lo siento, no pude completar tu solicitud en este momento. "
        "Por favor, intenta de nuevo en un momento.\n"
        "(Sorry, I couldn't complete the request right now. Please try again in a moment.)"
    )

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


DEFAULT_SYSTEM_PROMPT = (
    "You are Turbobujias AI Assistant, a specialist in spark plugs, glow plugs, diesel parts, "
    "SKU/UPC matching, and vehicle compatibility for the Venezuelan market. "
    "Use the catalog context as the primary source of truth. "
    "Before answering, silently self-check for contradictions, missing fitment details, and invented part numbers. "
    "If the catalog is insufficient or the application is ambiguous, say so clearly and ask for the minimum follow-up details needed, "
    "such as brand, model, engine, fuel type, or year. "
    "Prefer concise, practical answers with exact SKU references when available, short comparisons when useful, and a brief note about uncertainty when needed."
)
DEFAULT_SYSTEM_PROMPT_CANDIDATES = (
    APP_DIR.parent / "docs" / "chatbot" / "turbobujias_system_prompt_multilingual.md",
    APP_DIR.parent / "docs" / "chatbot" / "turbobujias_system_prompt_multilingual.txt",
)
_configured_prompt_path = os.environ.get("SYSTEM_PROMPT_PATH", "").strip()
SYSTEM_PROMPT_PATH = (
    Path(_configured_prompt_path).expanduser()
    if _configured_prompt_path
    else next(
        (
            candidate
            for candidate in DEFAULT_SYSTEM_PROMPT_CANDIDATES
            if candidate.exists() and candidate.is_file()
        ),
        DEFAULT_SYSTEM_PROMPT_CANDIDATES[0],
    )
)


def load_system_prompt(prompt_path: Path) -> str:
    if not prompt_path.exists() or not prompt_path.is_file():
        _log.warning(
            "System prompt file not found at %s; falling back to the bundled default prompt.",
            prompt_path,
        )
        return DEFAULT_SYSTEM_PROMPT

    try:
        prompt_text = prompt_path.read_text(encoding="utf-8").strip()
    except OSError as exc:
        _log.warning(
            "Could not read system prompt file at %s (%s); falling back to the bundled default prompt.",
            prompt_path,
            exc,
        )
        return DEFAULT_SYSTEM_PROMPT

    if prompt_text:
        _log.info("Loaded system prompt from %s", prompt_path)
        return prompt_text

    _log.warning(
        "System prompt file at %s is empty; falling back to the bundled default prompt.",
        prompt_path,
    )

    return DEFAULT_SYSTEM_PROMPT


SPANISH_HINT_TOKENS: frozenset[str] = frozenset(
    {
        "bujia",
        "bujía",
        "calentador",
        "compatibilidad",
        "cotizacion",
        "cotización",
        "carro",
        "vehiculo",
        "vehículo",
        "marca",
        "modelo",
        "motor",
        "ano",
        "año",
        "para",
        "sirve",
        "mano",
        "pana",
        "compa",
        "hermano",
        "rey",
        "en cuanto",
        "en bs",
        "divisas",
    }
)
ENGLISH_HINT_TOKENS: frozenset[str] = frozenset(
    {
        "spark plug",
        "glow plug",
        "fitment",
        "compatibility",
        "vehicle",
        "engine",
        "make",
        "model",
        "year",
        "fuel",
        "which",
        "what product",
        "matches",
        "lookup",
        "barcode",
    }
)
DEFAULT_CATALOG_QUERY = "spark plug glow plug diesel part catalog"
IMAGE_ONLY_HISTORY_LABEL = "[análisis de imagen / image analysis]"


def detect_response_language(text: str) -> str:
    lowered = text.casefold()

    if any(marker in text for marker in ("¿", "¡")) or re.search(r"[áéíóúñ]", lowered):
        return "es"

    spanish_hits = sum(token in lowered for token in SPANISH_HINT_TOKENS)
    english_hits = sum(token in lowered for token in ENGLISH_HINT_TOKENS)

    if english_hits > spanish_hits:
        return "en"

    return "es"


def normalize_mount_path(value: str | None) -> str:
    raw = str(value or "/").strip()
    if not raw:
        return "/"
    if raw == "/":
        return "/"
    return raw if raw.startswith("/") else f"/{raw}"

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


def get_provider_execution_order() -> list[str]:
    preferred_order: list[str] = []

    if LLM_PROVIDER == "github":
        if configured_providers["github"]:
            preferred_order.append("github")
        if GEMINI_FALLBACK_ENABLED and configured_providers["gemini"]:
            preferred_order.append("gemini")
        if configured_providers["huggingface"]:
            preferred_order.append("huggingface")
    elif LLM_PROVIDER == "gemini":
        if configured_providers["gemini"]:
            preferred_order.append("gemini")
        if configured_providers["github"]:
            preferred_order.append("github")
        if configured_providers["huggingface"]:
            preferred_order.append("huggingface")
    else:
        if configured_providers["huggingface"]:
            preferred_order.append("huggingface")
        if configured_providers["github"]:
            preferred_order.append("github")
        if GEMINI_FALLBACK_ENABLED and configured_providers["gemini"]:
            preferred_order.append("gemini")

    for provider_name in ("github", "gemini", "huggingface"):
        if provider_name == "gemini" and not GEMINI_FALLBACK_ENABLED and LLM_PROVIDER != "gemini":
            continue
        if configured_providers[provider_name] and provider_name not in preferred_order:
            preferred_order.append(provider_name)

    return preferred_order


def build_inventory_summary() -> dict[str, Any]:
    brand_counts: dict[str, int] = {}
    category_counts: dict[str, int] = {}
    total_stock = 0

    for item in inventory_items:
        brand = str(item.get("brand", "")).strip() or "Sin marca"
        raw_type = str(item.get("type", "")).strip()
        category = "Calentadores" if raw_type == "diesel_glow_plug" else "Bujías"
        brand_counts[brand] = brand_counts.get(brand, 0) + 1
        category_counts[category] = category_counts.get(category, 0) + 1
        total_stock += max(0, int(item.get("stock", 0) or 0))

    top_brands = sorted(brand_counts.items(), key=lambda item: (-item[1], item[0]))[:5]

    return {
        "total_products": len(inventory_items),
        "total_stock": total_stock,
        "total_brands": len(brand_counts),
        "categories": category_counts,
        "top_brands": top_brands,
    }


def is_inventory_summary_query(query: str) -> bool:
    lowered = query.casefold().strip()
    if not lowered:
        return False

    summary_tokens = (
        "inventory total",
        "total inventory",
        "total stock",
        "catalog summary",
        "database summary",
        "inventory summary",
        "total catalog",
        "total products",
        "resumen inventario",
        "resumen del inventario",
        "resumen catálogo",
        "resumen catalogo",
        "resumen base de datos",
        "total inventario",
        "total stock",
        "total catálogo",
        "total catalogo",
        "cuanto inventario",
        "cuánto inventario",
        "cuantos productos",
        "cuántos productos",
        "base de datos",
    )
    return any(token in lowered for token in summary_tokens)


def build_inventory_summary_answer(query: str) -> str:
    summary = build_inventory_summary()
    language = detect_response_language(query)
    top_brands_text = ", ".join(
        f"{brand} ({count})" for brand, count in summary["top_brands"]
    ) or "N/A"

    if language == "en":
        return "\n".join(
            [
                "**Catalog database summary**",
                "",
                f"- **Total SKUs:** {summary['total_products']}",
                f"- **Total units in stock:** {summary['total_stock']}",
                f"- **Brands represented:** {summary['total_brands']}",
                f"- **Spark plugs:** {summary['categories'].get('Bujías', 0)}",
                f"- **Glow plugs:** {summary['categories'].get('Calentadores', 0)}",
                f"- **Top brands:** {top_brands_text}",
                "",
                "If you want, I can also narrow this down by brand, SKU, UPC, or vehicle application.",
            ]
        )

    return "\n".join(
        [
            "**Resumen de la base de datos del catálogo**",
            "",
            f"- **Total de SKUs:** {summary['total_products']}",
            f"- **Total de unidades en inventario:** {summary['total_stock']}",
            f"- **Marcas registradas:** {summary['total_brands']}",
            f"- **Bujías:** {summary['categories'].get('Bujías', 0)}",
            f"- **Calentadores:** {summary['categories'].get('Calentadores', 0)}",
            f"- **Marcas con más referencias:** {top_brands_text}",
            "",
            "Si quieres, también puedo filtrar ese resumen por marca, SKU, UPC o aplicación del vehículo.",
        ]
    )


def try_inventory_summary_answer(query: str) -> tuple[str, list[str]] | None:
    if not is_inventory_summary_query(query):
        return None

    return build_inventory_summary_answer(query), ["inventory.json"]


def decode_image_data_url(image_data_url: str) -> tuple[str, str]:
    match = re.match(r"^data:(image/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$", image_data_url.strip())
    if not match:
        raise ValueError("Image payload must be a valid base64 data URL.")

    mime_type = match.group(1)
    cleaned = re.sub(r"\s+", "", match.group(2))
    _decoded_image = base64.b64decode(cleaned, validate=True)
    return mime_type, cleaned


def build_multimodal_prompt(query: str) -> str:
    normalized_query = query.strip()
    if normalized_query:
        return normalized_query
    return (
        "Analyze the attached autopart image, identify whether it looks closer to a spark plug, "
        "glow plug, or diesel part, extract any visible markings, and ground the answer in the local catalog."
    )


def extract_gemini_text(payload: dict[str, Any]) -> str:
    candidates = payload.get("candidates", [])
    if isinstance(candidates, list):
        for candidate in candidates:
            if not isinstance(candidate, dict):
                continue

            content = candidate.get("content", {})
            if not isinstance(content, dict):
                continue

            parts = content.get("parts", [])
            if not isinstance(parts, list):
                continue

            texts = [
                str(part.get("text", "")).strip()
                for part in parts
                if isinstance(part, dict) and str(part.get("text", "")).strip()
            ]
            if texts:
                return "\n".join(texts)

    prompt_feedback = payload.get("promptFeedback", {})
    if isinstance(prompt_feedback, dict):
        block_reason = str(prompt_feedback.get("blockReason", "")).strip()
        if block_reason:
            raise RuntimeError(f"Gemini response was blocked: {block_reason}.")

    raise RuntimeError("Gemini response did not include any text content.")

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
SYSTEM_PROMPT = load_system_prompt(SYSTEM_PROMPT_PATH)

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


def build_exact_lookup_answer(item: dict[str, Any], query: str) -> str:
    sku = str(item.get("sku", "")).strip()
    upc = str(item.get("upc", "")).strip()
    brand = str(item.get("brand", "")).strip()
    model = str(item.get("model", "")).strip()
    raw_type = str(item.get("type", "")).strip()
    part_type_es = "Calentador" if raw_type == "diesel_glow_plug" else "Bujía"
    part_type_en = "Glow plug" if raw_type == "diesel_glow_plug" else "Spark plug"
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

    language = detect_response_language(query)

    if language == "en":
        answer_lines = [
            "**Exact match confirmed**",
            "",
            f"The code **{sku}** matches:",
            "",
            f"- **Brand:** {brand}",
            f"- **Model:** {model}",
            f"- **UPC:** {upc or 'N/A'}",
            f"- **Type:** {part_type_en or 'N/A'}",
            f"- **Thread:** {thread or 'N/A'}",
            f"- **Gap:** {gap or 'N/A'}",
            f"- **Electrode:** {electrode or 'N/A'}",
            f"- **Price:** {price or 'N/A'}",
        ]

        if application_lines:
            answer_lines.extend(["- **Applications:**", *application_lines])

        answer_lines.append("")
        answer_lines.append(
            "If you'd like, I can also verify fitment by make, model, engine, fuel type, and year."
        )
        return "\n".join(answer_lines)

    answer_lines = [
        "**Coincidencia exacta confirmada**",
        "",
        f"El código **{sku}** corresponde a:",
        "",
        f"- **Marca:** {brand}",
        f"- **Modelo:** {model}",
        f"- **UPC:** {upc or 'N/A'}",
        f"- **Tipo:** {part_type_es or 'N/A'}",
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

    answer = build_exact_lookup_answer(exact_item, query)
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
if whisper is None:
    print(
        "ERROR: openai-whisper is not installed in the active Python environment. "
        "Install it with `python -m pip install openai-whisper` or use the project's requirements.txt.",
        file=sys.stderr,
    )
    sys.exit(1)

print("Loading Whisper model…")
whisper_model = whisper.load_model("base")


# ─────────────────────────────────────────────
# 5. Helper functions
# ─────────────────────────────────────────────
def _call_github_models(messages: list[dict[str, Any]]) -> str:
    """Send *messages* to GitHub Models with automatic retry on rate-limit errors.

    Makes up to 3 attempts. The delays before each attempt are:
      attempt 1: 0 s (immediate)
      attempt 2: _RETRY_WAIT_SECONDS[0] s
      attempt 3: _RETRY_WAIT_SECONDS[1] s
    Re-raises immediately on any non-rate-limit exception.
    """
    max_attempts = 1 + len(_RETRY_WAIT_SECONDS)  # 3
    delays = (0.0,) + _RETRY_WAIT_SECONDS        # delay before each attempt
    for attempt, wait in enumerate(delays):
        if wait:
            _log.info("GitHub Models rate-limit; waiting %.1fs before attempt %d/%d…", wait, attempt + 1, max_attempts)
            time.sleep(wait)
        is_last_attempt = attempt == max_attempts - 1
        try:
            response = github_client.chat.completions.create(  # type: ignore[union-attr]
                messages=cast(Any, messages),
                temperature=0.3,
                top_p=1.0,
                max_tokens=800,
                model=GITHUB_MODELS_MODEL,
            )
            return (response.choices[0].message.content or "").strip()
        except Exception as exc:
            if not _is_rate_limit_or_provider_error(exc) or is_last_attempt:
                raise
            _log.warning("GitHub Models rate-limit on attempt %d/%d, will retry…", attempt + 1, max_attempts)
    # Unreachable: the loop always raises before exhausting all attempts without a return.
    raise RuntimeError("_call_github_models: exhausted all retry attempts without a result or exception")


def build_chat_user_message(query: str, docs: list[Document]) -> str:
    context = "\n\n".join(doc.page_content for doc in docs)
    return (
        "Structured catalog context (primary source of truth — do not override it with assumptions):\n"
        f"{context}\n\n"
        f"Customer message:\n{query}"
    )


def build_github_messages(
    query: str,
    docs: list[Document],
    history: list[tuple[str, str]] | None = None,
    image_data_url: str | None = None,
) -> list[dict[str, Any]]:
    messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    for previous_user, previous_assistant in (history or [])[-4:]:
        if previous_user:
            messages.append({"role": "user", "content": previous_user})
        if previous_assistant:
            messages.append({"role": "assistant", "content": previous_assistant})

    prompt_text = build_chat_user_message(build_multimodal_prompt(query), docs)
    content: str | list[dict[str, Any]] = prompt_text
    if image_data_url:
        content = [
            {"type": "text", "text": prompt_text},
            {"type": "image_url", "image_url": {"url": image_data_url}},
        ]

    messages.append(
        {
            "role": "user",
            "content": content,
        }
    )
    return messages


def answer_with_github_models(
    query: str,
    docs: list[Document],
    history: list[tuple[str, str]] | None = None,
    image_data_url: str | None = None,
) -> tuple[str, list[str]]:
    messages = build_github_messages(query, docs, history, image_data_url=image_data_url)

    answer = _call_github_models(messages)
    sources = collect_source_skus(query, answer, docs)
    return answer, sources


def answer_with_huggingface(
    query: str,
    history: list[tuple[str, str]] | None = None,
    docs: list[Document] | None = None,
    image_data_url: str | None = None,
) -> tuple[str, list[str]]:
    if huggingface_client is None:
        raise RuntimeError("Hugging Face LLM is not configured.")
    if image_data_url:
        raise RuntimeError("Image analysis requires GitHub Models or Gemini.")

    docs = docs or get_relevant_docs(query)
    exact_lookup = try_exact_lookup_answer(query, docs)
    if exact_lookup is not None:
        return exact_lookup

    messages = build_github_messages(query, docs, history)
    response = huggingface_client.chat_completion(
        messages=messages,
        model=HF_MODEL_REPO_ID,
        max_tokens=HF_MAX_NEW_TOKENS,
        temperature=0.2,
        top_p=0.9,
    )

    answer = str(
        response.choices[0].message.content or ""
    ).strip()
    sources = collect_source_skus(query, answer, docs)
    return answer, sources


def answer_with_gemini(
    query: str,
    history: list[tuple[str, str]] | None = None,
    docs: list[Document] | None = None,
    image_data_url: str | None = None,
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

    user_parts: list[dict[str, Any]] = [{"text": build_chat_user_message(build_multimodal_prompt(query), docs)}]
    if image_data_url:
        mime_type, encoded_image = decode_image_data_url(image_data_url)
        user_parts.append(
            {
                "inlineData": {
                    "mimeType": mime_type,
                    "data": encoded_image,
                }
            }
        )

    contents.append(
        {
            "role": "user",
            "parts": user_parts,
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
    image_data_url: str | None = None,
) -> tuple[str, list[str]]:
    summary_answer = try_inventory_summary_answer(query)
    if summary_answer is not None:
        return summary_answer

    docs = get_relevant_docs(query or DEFAULT_CATALOG_QUERY)
    exact_lookup = try_exact_lookup_answer(query, docs)
    if exact_lookup is not None:
        return exact_lookup

    handlers = {
        "github": answer_with_github_models,
        "huggingface": answer_with_huggingface,
        "gemini": answer_with_gemini,
    }
    provider_order = get_provider_execution_order()
    if image_data_url:
        provider_order = [provider for provider in provider_order if provider in {"github", "gemini"}]
        if not provider_order:
            raise RuntimeError("Image analysis requires GitHub Models or Gemini credentials.")
    last_error: Exception | None = None

    for provider_name in provider_order:
        handler = handlers[provider_name]
        try:
            _log.info("Answering query with provider=%s", provider_name)
            return handler(query, history=history, docs=docs, image_data_url=image_data_url)
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


def build_gradio_messages(history: list[tuple[str, str]]) -> list[dict[str, str]]:
    """Convert tuple history into Gradio's messages format.

    Gradio 6 Chatbot defaults to `type="messages"`, where each entry must be a
    dictionary containing `role` and `content` keys.
    """
    messages: list[dict[str, str]] = []
    for user_message, assistant_message in history:
        if str(user_message).strip():
            messages.append({"role": "user", "content": str(user_message)})
        if str(assistant_message).strip():
            messages.append({"role": "assistant", "content": str(assistant_message)})
    return messages


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


def chat_api(
    message: str,
    history: list[dict[str, str]] | None = None,
    image_data_url: str = "",
) -> dict[str, object]:
    """Chat endpoint for web clients that need structured responses.

    Args:
        message: User message in Spanish or English.
        history: Previous conversation messages as objects with user and assistant keys.

    Returns:
        A JSON-safe payload containing the assistant reply, cited source SKUs, and updated history.
    """
    current_history = normalize_history(history)

    if not message.strip() and not image_data_url.strip():
        return {
            "reply": "",
            "sources": [],
            "history": serialize_history(current_history),
        }

    try:
        normalized_image_data_url = str(image_data_url or "").strip()
        answer, sources = answer_query(
            message,
            current_history,
            image_data_url=normalized_image_data_url or None,
        )
    except Exception as exc:
        answer = _safe_llm_error_message(exc)
        sources = []

    history_label = message or IMAGE_ONLY_HISTORY_LABEL
    updated_history = current_history + [(history_label, answer)]
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
    imageDataUrl: str = ""


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
        image_data_url=payload.imageDataUrl,
    )
    raw_sources = result.get("sources", [])
    sources = raw_sources if isinstance(raw_sources, list) else []
    raw_history = result.get("history", [])
    normalized_history = raw_history if isinstance(raw_history, list) else []

    return ChatResponse(
        reply=str(result.get("reply", "")),
        sources=[str(item) for item in sources],
        history=[ChatTurn(**item) for item in normalized_history if isinstance(item, dict)],
    )


def answer_text(query: str, history: list[tuple[str, str]]) -> tuple[str, list[dict[str, str]], list[tuple[str, str]]]:
    """Process a text query and return (cleared_input, updated_chatbot, updated_state)."""
    if not query.strip():
        return "", build_gradio_messages(history), history
    try:
        answer, sources = answer_query(query, history)
    except Exception as exc:
        answer = _safe_llm_error_message(exc)
        sources = []
    if sources:
        answer += f"\n\n*Sources: {', '.join(sources)}*"
    updated_history = history + [(query, answer)]
    return "", build_gradio_messages(updated_history), updated_history


def answer_voice(audio_path: str | None, history: list[tuple[str, str]]) -> tuple[list[dict[str, str]], list[tuple[str, str]]]:
    """Transcribe voice input with Whisper then run QA.

    Returns (updated_chatbot, updated_state).
    """
    if audio_path is None:
        return build_gradio_messages(history), history
    try:
        transcription = whisper_model.transcribe(audio_path)["text"]
    except Exception as exc:
        _log.warning("Whisper transcription error (hidden from user): %s", exc, exc_info=True)
        error_message = (
            "Lo siento, no pude transcribir ese audio en este momento. "
            "Por favor, intenta de nuevo con una grabación más corta o clara.\n"
            "(Sorry, I couldn't transcribe that audio right now. "
            "Please try again with a shorter or clearer recording.)"
        )
        updated_history = history + [(
            "[voice input]",
            error_message,
        )]
        return build_gradio_messages(updated_history), updated_history

    _, updated_messages, updated_state = answer_text(transcription, history)
    return updated_messages, updated_state


# ─────────────────────────────────────────────
# 6. Gradio UI
# ─────────────────────────────────────────────
with gr.Blocks(title="Turbobujias AI Assistant") as demo:
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


app = gr.mount_gradio_app(
    api_app,
    demo,
    path=normalize_mount_path(os.environ.get("GRADIO_MOUNT_PATH", "/")),
)


def launch_demo_with_optional_share() -> None:
    server_name = os.environ.get("GRADIO_SERVER_NAME", "127.0.0.1")
    server_port = int(os.environ.get("PORT", os.environ.get("GRADIO_SERVER_PORT", "7860")))
    share_enabled = env_bool("GRADIO_SHARE", False)

    launch_kwargs: dict[str, Any] = {
        "server_name": server_name,
        "server_port": server_port,
        "theme": gr.themes.Soft(),
        "show_error": True,
    }

    if share_enabled:
        launch_kwargs["share"] = True
        share_server_address = os.environ.get("GRADIO_SHARE_SERVER_ADDRESS", "").strip()
        share_server_protocol = os.environ.get("GRADIO_SHARE_SERVER_PROTOCOL", "").strip()
        if share_server_address:
            launch_kwargs["share_server_address"] = share_server_address
        if share_server_protocol:
            launch_kwargs["share_server_protocol"] = share_server_protocol

    demo.queue(default_concurrency_limit=2)
    _app, local_url, share_url = demo.launch(**launch_kwargs)

    _log.info("Gradio local URL: %s", local_url)
    if share_url:
        _log.info("Gradio public share URL: %s", share_url)
    else:
        _log.info("Gradio share is disabled; no public URL was created.")

if __name__ == "__main__":
    if env_bool("GRADIO_SHARE", False):
        launch_demo_with_optional_share()
    else:
        demo.queue(default_concurrency_limit=2)
        uvicorn.run(
            app,
            host=os.environ.get("GRADIO_SERVER_NAME", "127.0.0.1"),
            port=int(os.environ.get("PORT", os.environ.get("GRADIO_SERVER_PORT", "7860"))),
        )
