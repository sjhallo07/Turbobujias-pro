"""Minimal Streamable HTTP MCP client for Gradio and Hugging Face workflows.

Usage:
    python mcp_http_client.py
    python mcp_http_client.py --list-tools
    python mcp_http_client.py --search "gradio chatbot blocks state"
    python mcp_http_client.py --load-docs
    python mcp_http_client.py --call docs_mcp_search_gradio_docs --arguments '{"query":"gradio audio"}'
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

APP_DIR = Path(__file__).parent
load_dotenv(APP_DIR / ".env")

DEFAULT_MCP_SERVER_URL = "https://gradio-docs-mcp.hf.space/gradio_api/mcp/"
DEFAULT_PROTOCOL_VERSION = "2025-06-18"
DEFAULT_CLIENT_NAME = "turbobujias-mcp-client"
DEFAULT_CLIENT_VERSION = "0.1.0"


@dataclass
class MCPTool:
    name: str
    description: str
    input_schema: dict[str, Any]


class MCPHttpClient:
    """Tiny MCP client with just enough protocol to be useful in development."""

    def __init__(
        self,
        server_url: str,
        protocol_version: str = DEFAULT_PROTOCOL_VERSION,
        bearer_token: str | None = None,
        client_name: str = DEFAULT_CLIENT_NAME,
        client_version: str = DEFAULT_CLIENT_VERSION,
        timeout: int = 60,
    ) -> None:
        self.server_url = server_url.rstrip("/") + "/"
        self.protocol_version = protocol_version
        self.client_name = client_name
        self.client_version = client_version
        self.timeout = timeout
        self.session = requests.Session()
        self.session_id: str | None = None
        self.request_id = 0

        if bearer_token:
            self.session.headers.update({"Authorization": f"Bearer {bearer_token}"})

    def _next_id(self) -> int:
        self.request_id += 1
        return self.request_id

    def _build_headers(self) -> dict[str, str]:
        headers = {
            "Accept": "application/json, text/event-stream",
            "Content-Type": "application/json",
            "MCP-Protocol-Version": self.protocol_version,
        }
        if self.session_id:
            headers["Mcp-Session-Id"] = self.session_id
        return headers

    def _extract_json(self, response: requests.Response) -> dict[str, Any]:
        content_type = response.headers.get("Content-Type", "")
        body = response.text.strip()

        if "text/event-stream" in content_type:
            data_lines: list[str] = []
            for line in body.splitlines():
                if line.startswith("data:"):
                    data_lines.append(line.removeprefix("data:").strip())
            if not data_lines:
                raise RuntimeError(f"No JSON payload found in SSE response: {body}")
            return json.loads("\n".join(data_lines))

        if not body:
            return {}

        return response.json()

    def _post(self, payload: dict[str, Any]) -> dict[str, Any]:
        response = self.session.post(
            self.server_url,
            headers=self._build_headers(),
            json=payload,
            timeout=self.timeout,
        )
        response.raise_for_status()

        session_id = response.headers.get("Mcp-Session-Id")
        if session_id:
            self.session_id = session_id

        return self._extract_json(response)

    def initialize(self) -> dict[str, Any]:
        payload = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "initialize",
            "params": {
                "protocolVersion": self.protocol_version,
                "capabilities": {},
                "clientInfo": {
                    "name": self.client_name,
                    "version": self.client_version,
                },
            },
        }
        result = self._post(payload)
        self._post({"jsonrpc": "2.0", "method": "notifications/initialized"})
        return result.get("result", {})

    def list_tools(self) -> list[MCPTool]:
        payload = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "tools/list",
            "params": {},
        }
        result = self._post(payload)
        tools = result.get("result", {}).get("tools", [])
        return [
            MCPTool(
                name=tool.get("name", ""),
                description=tool.get("description", ""),
                input_schema=tool.get("inputSchema", {}),
            )
            for tool in tools
        ]

    def call_tool(self, name: str, arguments: dict[str, Any] | None = None) -> dict[str, Any]:
        payload = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "tools/call",
            "params": {
                "name": name,
                "arguments": arguments or {},
            },
        }
        result = self._post(payload)
        return result.get("result", {})


def parse_arguments(raw_arguments: str | None) -> dict[str, Any]:
    if not raw_arguments:
        return {}

    try:
        parsed = json.loads(raw_arguments)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON for --arguments: {exc}") from exc

    if not isinstance(parsed, dict):
        raise SystemExit("--arguments must be a JSON object.")

    return parsed


def print_tool_result(result: dict[str, Any]) -> None:
    if not result:
        print("No result received.")
        return

    content = result.get("content", [])
    if result.get("structuredContent") is not None:
        print(json.dumps(result["structuredContent"], indent=2, ensure_ascii=False))
        return

    if not content:
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return

    for index, item in enumerate(content, start=1):
        item_type = item.get("type", "unknown")
        print(f"\n[{index}] {item_type}")
        if item_type == "text":
            print(item.get("text", ""))
        else:
            print(json.dumps(item, indent=2, ensure_ascii=False))

    if result.get("isError"):
        print("\nTool returned an error result.", file=sys.stderr)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Minimal MCP HTTP client for Gradio docs and Hugging Face-hosted MCP tools.",
    )
    parser.add_argument(
        "--server-url",
        default=os.environ.get("MCP_SERVER_URL", DEFAULT_MCP_SERVER_URL),
        help="Remote MCP endpoint URL.",
    )
    parser.add_argument(
        "--protocol-version",
        default=os.environ.get("MCP_PROTOCOL_VERSION", DEFAULT_PROTOCOL_VERSION),
        help="Negotiated MCP protocol version to send in HTTP headers.",
    )
    parser.add_argument(
        "--token",
        default=os.environ.get("MCP_AUTH_BEARER_TOKEN", "").strip(),
        help="Optional bearer token for private MCP servers.",
    )
    parser.add_argument(
        "--list-tools",
        action="store_true",
        help="List available tools and exit.",
    )
    parser.add_argument(
        "--search",
        help="Shortcut for Gradio docs MCP search tool.",
    )
    parser.add_argument(
        "--load-docs",
        action="store_true",
        help="Shortcut for loading the full Gradio docs summary tool.",
    )
    parser.add_argument(
        "--call",
        help="Tool name to call explicitly.",
    )
    parser.add_argument(
        "--arguments",
        help="JSON object of tool arguments for --call.",
    )
    return parser


def run_interactive(client: MCPHttpClient) -> None:
    print("Connected. Type 'help' for commands, 'quit' to exit.\n")

    while True:
        try:
            command = input("mcp> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye.")
            return

        if not command:
            continue
        if command in {"quit", "exit"}:
            print("Bye.")
            return
        if command == "help":
            print(
                "Commands:\n"
                "  tools                        List available tools\n"
                "  search <query>               Search Gradio docs MCP server\n"
                "  load                         Load full Gradio docs summary\n"
                "  call <tool> <json-args>      Call a tool with JSON args\n"
                "  quit                         Exit the client"
            )
            continue
        if command == "tools":
            tools = client.list_tools()
            for tool in tools:
                print(f"- {tool.name}: {tool.description}")
            continue
        if command == "load":
            print_tool_result(client.call_tool("docs_mcp_load_gradio_docs"))
            continue
        if command.startswith("search "):
            query = command.removeprefix("search ").strip()
            print_tool_result(
                client.call_tool("docs_mcp_search_gradio_docs", {"query": query})
            )
            continue
        if command.startswith("call "):
            _, _, rest = command.partition(" ")
            tool_name, _, raw_json = rest.partition(" ")
            arguments = parse_arguments(raw_json or "{}")
            print_tool_result(client.call_tool(tool_name, arguments))
            continue

        print("Unknown command. Type 'help' for available commands.")


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    client = MCPHttpClient(
        server_url=args.server_url,
        protocol_version=args.protocol_version,
        bearer_token=args.token or None,
    )
    init_result = client.initialize()
    server_name = init_result.get("serverInfo", {}).get("name", "Unknown server")
    server_version = init_result.get("serverInfo", {}).get("version", "?")
    print(f"Connected to {server_name} {server_version} at {args.server_url}")

    if args.list_tools:
        tools = client.list_tools()
        for tool in tools:
            print(f"- {tool.name}: {tool.description}")
        return

    if args.search:
        print_tool_result(client.call_tool("docs_mcp_search_gradio_docs", {"query": args.search}))
        return

    if args.load_docs:
        print_tool_result(client.call_tool("docs_mcp_load_gradio_docs"))
        return

    if args.call:
        print_tool_result(client.call_tool(args.call, parse_arguments(args.arguments)))
        return

    run_interactive(client)


if __name__ == "__main__":
    main()
