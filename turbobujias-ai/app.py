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
import os
import sys
from pathlib import Path

import gradio as gr
import whisper
from dotenv import load_dotenv
from langchain.chains import RetrievalQA
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.llms import HuggingFaceHub
from langchain_community.vectorstores import FAISS
from langchain.docstore.document import Document
from openai import OpenAI

APP_DIR = Path(__file__).parent
load_dotenv(APP_DIR / ".env")

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
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "").strip().lower()

if not LLM_PROVIDER:
    LLM_PROVIDER = "github" if GITHUB_TOKEN else "huggingface"

if LLM_PROVIDER not in {"github", "huggingface"}:
    print(
        "ERROR: LLM_PROVIDER must be either 'github' or 'huggingface'.",
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

if LLM_PROVIDER == "github" and not GITHUB_TOKEN:
    print(
        "ERROR: GITHUB_TOKEN environment variable is not set. "
        "Add a GitHub personal access token with models:read permission. "
        "GITHUB_MODELS_TOKEN is still accepted as a backwards-compatible fallback.",
        file=sys.stderr,
    )
    sys.exit(1)

# ─────────────────────────────────────────────
# 1. Load inventory data
# ─────────────────────────────────────────────
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
        docs.append(Document(page_content=text, metadata={"sku": item["sku"]}))
    return docs


# ─────────────────────────────────────────────
# 2. Build FAISS vector store
# ─────────────────────────────────────────────
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

print("Loading embeddings model…")
embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)

print("Building FAISS index from inventory…")
documents = load_inventory()
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(documents)
vectorstore = FAISS.from_documents(chunks, embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

# ─────────────────────────────────────────────
# 3. Set up LLM (Mistral-7B via HuggingFaceHub)
# ─────────────────────────────────────────────
qa_chain = None
github_client = None

if LLM_PROVIDER == "huggingface":
    llm = HuggingFaceHub(
        repo_id=HF_MODEL_REPO_ID,
        huggingfacehub_api_token=HF_TOKEN,
        model_kwargs={"temperature": 0.3, "max_new_tokens": 512},
    )

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True,
    )

if LLM_PROVIDER == "github":
    github_client = OpenAI(
        base_url=(
            f"https://models.github.ai/orgs/{GITHUB_MODELS_ORG}/inference"
            if GITHUB_MODELS_ORG
            else "https://models.github.ai/inference"
        ),
        api_key=GITHUB_TOKEN,
    )

# ─────────────────────────────────────────────
# 4. Whisper model for voice transcription
# ─────────────────────────────────────────────
print("Loading Whisper model…")
whisper_model = whisper.load_model("base")


# ─────────────────────────────────────────────
# 5. Helper functions
# ─────────────────────────────────────────────
def answer_with_github_models(
    query: str,
    history: list[tuple[str, str]] | None = None,
) -> tuple[str, list[str]]:
    docs = retriever.invoke(query)
    context = "\n\n".join(doc.page_content for doc in docs)
    messages = [
        {
            "role": "system",
            "content": (
                "You are Turbobujias AI Assistant. Answer only with help from the "
                "provided catalog context when possible. If the catalog does not contain "
                "enough information, say so clearly and avoid inventing part numbers or fitments."
            ),
        }
    ]

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

    response = github_client.chat.completions.create(
        messages=messages,
        temperature=0.3,
        top_p=1.0,
        max_tokens=800,
        model=GITHUB_MODELS_MODEL,
    )

    answer = (response.choices[0].message.content or "").strip()
    sources = [doc.metadata.get("sku", "?") for doc in docs]
    return answer, sources


def answer_query(
    query: str,
    history: list[tuple[str, str]] | None = None,
) -> tuple[str, list[str]]:
    if LLM_PROVIDER == "github":
        return answer_with_github_models(query, history=history)

    result = qa_chain({"query": query})
    answer = result["result"].strip()
    sources = [doc.metadata.get("sku", "?") for doc in result.get("source_documents", [])]
    return answer, sources


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
        answer = (
            "Sorry, I couldn't complete the request right now. "
            "Please try again in a moment and verify that the Space secrets are configured correctly.\n\n"
            f"Technical detail: {exc}"
        )
        sources = []

    updated_history = current_history + [(message, answer)]
    return {
        "reply": answer,
        "sources": sources,
        "history": serialize_history(updated_history),
    }


def answer_text(query: str, history: list) -> tuple[str, list, list]:
    """Process a text query and return (cleared_input, updated_chatbot, updated_state)."""
    if not query.strip():
        return "", history, history
    try:
        answer, sources = answer_query(query, history)
    except Exception as exc:
        answer = (
            "Sorry, I couldn't complete the request right now. "
            "Please try again in a moment and verify that the Space secrets are configured correctly.\n\n"
            f"Technical detail: {exc}"
        )
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
        error_message = (
            "Sorry, I couldn't transcribe that audio right now. "
            "Please try again with a shorter or clearer recording.\n\n"
            f"Technical detail: {exc}"
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
    gr.api(chat_api, api_name="chat")

    gr.Markdown(
        """
        # 🔧 Turbobujias AI Assistant
        Ask compatibility questions about **Diesel and Spark Plugs** in English or Spanish.
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

if __name__ == "__main__":
    demo.queue(default_concurrency_limit=2).launch(
        server_name=os.environ.get("GRADIO_SERVER_NAME", "0.0.0.0"),
        server_port=int(os.environ.get("PORT", os.environ.get("GRADIO_SERVER_PORT", "7860"))),
        show_error=True,
    )

