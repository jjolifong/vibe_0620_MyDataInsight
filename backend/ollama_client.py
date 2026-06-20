from __future__ import annotations

import os

import httpx

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "exaone3.5:7.8b")


async def generate_insight(prompt: str) -> dict[str, str]:
    url = f"{OLLAMA_BASE_URL}/api/chat"
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=240.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
    except httpx.ConnectError:
        return {
            "content": (
                "Ollama 서버에 연결할 수 없습니다. `ollama serve` 실행 후 "
                f"`ollama pull {OLLAMA_MODEL}` 로 모델을 준비해주세요."
            ),
            "model": OLLAMA_MODEL,
            "status": "offline",
        }
    except httpx.HTTPStatusError as exc:
        return {
            "content": f"Ollama API 오류: {exc.response.status_code} {exc.response.text}",
            "model": OLLAMA_MODEL,
            "status": "error",
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "content": f"인사이트 생성 중 오류가 발생했습니다: {exc}",
            "model": OLLAMA_MODEL,
            "status": "error",
        }

    message = data.get("message", {})
    content = message.get("content") or data.get("response", "")
    return {
        "content": content,
        "model": OLLAMA_MODEL,
        "status": "ok",
    }
