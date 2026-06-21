from __future__ import annotations

import os

import httpx

LMSTUDIO_BASE_URL = os.getenv("LMSTUDIO_BASE_URL", "http://localhost:1234")


async def generate_insight(prompt: str, model: str) -> dict[str, str]:
    url = f"{LMSTUDIO_BASE_URL}/v1/chat/completions"
    payload = {
        "model": model,
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
                "LM Studio 서버에 연결할 수 없습니다. LM Studio를 실행하고 "
                f"로컬 서버(localhost:1234)에서 모델({model})을 로드해주세요."
            ),
            "model": model,
            "status": "offline",
        }
    except httpx.HTTPStatusError as exc:
        return {
            "content": f"LM Studio API 오류: {exc.response.status_code} {exc.response.text}",
            "model": model,
            "status": "error",
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "content": f"인사이트 생성 중 오류가 발생했습니다: {exc}",
            "model": model,
            "status": "error",
        }

    choices = data.get("choices", [])
    content = ""
    if choices:
        content = choices[0].get("message", {}).get("content", "")

    return {
        "content": content,
        "model": model,
        "status": "ok",
    }
