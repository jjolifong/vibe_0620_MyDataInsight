# MyDataInsight

LM Studio 기반 로컬 LLM + FastAPI CSV 데이터 분석 웹 애플리케이션입니다.

## 구조

- `frontend/` — React 18 + Vite + TypeScript + Tailwind + Zustand + Recharts
- `backend/` — FastAPI + pandas (통계/상관분석/차트 데이터/LM Studio 프록시)

## 사전 준비

1. **Python 3.10+** (또는 Anaconda) — `uvicorn`, `pip` 사용 가능해야 함
2. **Node.js 18+** — `npm` 사용
3. **LM Studio** — Local Server `http://localhost:1234` 실행, 사용할 모델 로드

### 최초 1회 — 의존성 설치

```bash
# 백엔드
cd backend
pip install -r requirements.txt

# 프론트엔드
cd frontend
npm install
```

## 실행 방법

### Windows — 배치 파일 (권장)

프로젝트 루트(`C:\work_wdai\vibe_0620_MyDataInsight`)에서:

| 파일 | 설명 |
|---|---|
| **`start-all.bat`** | 백엔드 + 프론트를 각각 새 cmd 창에서 실행 |
| `start-backend.bat` | 백엔드만 (포트 8000) |
| `start-frontend.bat` | 프론트만 (포트 5173) |

1. LM Studio에서 Local Server 시작 및 모델 로드
2. **`start-all.bat`** 더블클릭
3. 브라우저에서 **http://127.0.0.1:5173** 접속

종료: 백엔드·프론트 cmd 창에서 **Ctrl+C** 또는 창 닫기

> Conda 환경을 쓰는 경우 `start-backend.bat` 안의 `call ... activate.bat` 줄 주석을 해제하고 환경명을 수정하세요.

### 수동 실행

#### 1. 백엔드

```bash
cd backend
uvicorn main:app --reload --port 8000
```

#### 2. 프론트엔드

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

브라우저에서 http://127.0.0.1:5173 접속

#### 3. LM Studio (인사이트용)

LM Studio 앱에서 **Local Server**를 켜고 (`localhost:1234`), 설정 패널에서 모델을 선택한 뒤 인사이트를 요청합니다.

## API

| 엔드포인트 | 설명 |
|---|---|
| `GET /api/health` | 백엔드 상태 확인 |
| `GET /api/models` | LM Studio 모델 목록 |
| `POST /api/upload` | CSV 업로드 및 메타정보 반환 |
| `POST /api/analyze` | 선택 컬럼 EDA (전체 N행 기준) |
| `POST /api/plot-data` | 차트 데이터 가공 |
| `POST /api/insights` | LLM 인사이트 생성 (`model` 필드 필수) |

## 참고

- 통계/상관분석은 **백엔드에서 전체 데이터 기준**으로 계산합니다.
- 인사이트 요청 시 LM Studio에는 최대 100행 샘플만 전달되며, 프롬프트에 전체 행 수와 샘플 구분이 명시됩니다.
- 로컬 LLM 응답이 느릴 수 있어 Vite proxy 및 httpx timeout은 **600초(10분)** 로 설정되어 있습니다.
- 화면 하단 **디버그 로그** 패널에서 fetch 요청 상태를 확인할 수 있습니다.
- `Churn` 컬럼의 `True.`/`False.` 형태 불리언 값은 정규화 후 처리됩니다.
