from __future__ import annotations

import os

import httpx

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "exaone3.5:7.8b")


async def generate_insight(prompt: str, model: str) -> dict[str, str]:
    use_model = model or OLLAMA_MODEL
    url = f"{OLLAMA_BASE_URL}/v1/chat/completions"
    payload = {
        "model": use_model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=600.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
    except httpx.ConnectError:
        return {
            "content": (
                "Ollama 서버에 연결할 수 없습니다. `ollama serve` 실행 후 "
                f"`ollama pull {use_model}` 로 모델을 준비해주세요."
            ),
            "model": use_model,
            "status": "offline",
        }
    except httpx.HTTPStatusError as exc:
        return {
            "content": f"Ollama API 오류: {exc.response.status_code} {exc.response.text}",
            "model": use_model,
            "status": "error",
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "content": f"인사이트 생성 중 오류가 발생했습니다: {exc}",
            "model": use_model,
            "status": "error",
        }

    choices = data.get("choices", [])
    content = ""
    if choices:
        content = choices[0].get("message", {}).get("content", "")

    return {
        "content": content,
        "model": use_model,
        "status": "ok",
    }
