# MyDataInsight

LM Studio 기반 로컬 LLM + FastAPI CSV 데이터 분석 웹 애플리케이션입니다.

## 구조

- `frontend/` — React 18 + Vite + TypeScript + Tailwind + Zustand + Chart.js
- `backend/` — FastAPI + pandas (통계/상관분석/차트 데이터/LM Studio 프록시)

### 주요 파일

| 경로 | 역할 |
|---|---|
| `backend/main.py` | FastAPI API (`/api/*`) |
| `backend/lmstudio_client.py` | LM Studio `chat/completions` 호출 (현재 인사이트 LLM) |
| `backend/ollama_client.py` | Ollama 클라이언트 (레거시, 미사용) |
| `frontend/src/main.tsx` | 앱 부트스트랩 + **fetch 통합 인터셉터** 설치 |
| `frontend/src/hooks/useDebugLog.ts` | fetch 디버그 로그 스토어·헬퍼 |
| `frontend/src/components/DebugLogPanel.tsx` | 화면 하단 디버그 로그 UI |
| `frontend/src/store/useAppStore.ts` | 앱 상태 (`selectedModel` 포함) |
| `frontend/src/components/AnalysisDashboard.tsx` | EDA·시각화·상관분석 대시보드 (Chart.js) |
| `frontend/src/charts/` | Chart.js 설정·어댑터·차트 뷰 (Bar/Line/Area/Pie/Scatter/Bubble/Scale) |
| `frontend/src/components/SettingsPanel.tsx` | LM Studio 모델 선택·분석 설정 |
| `start-all.bat` / `start-backend.bat` / `start-frontend.bat` | Windows 실행 스크립트 |

### 프론트엔드 fetch 흐름

`main.tsx`가 React 렌더링 **이전**에 `window.fetch`를 한 번만 감쌉니다.

1. 모든 요청 → 디버그 로그에 `pending` / `success` / `error` 기록
2. `POST /api/insights` + JSON body → `useAppStore`의 `selectedModel`을 body에 `model` 필드로 주입
3. 이후 native `fetch` 호출 (Vite dev proxy → 백엔드 `localhost:8000`)

설정 패널에서 고른 모델은 `selectedModel` + `localStorage`(`mydatainsight.lmstudioModel`)에 저장됩니다.

> UI 일부(인사이트 버튼 등)에는 아직 「EXAONE」 문구가 남아 있을 수 있으나, 실제 LLM 백엔드는 **LM Studio**입니다.

### 사용 흐름

1. **CSV 업로드** → `sessionId` 생성, Papaparse 클라이언트 미리보기
2. **EDA 자동 실행** (`POST /api/analyze`) → 기본통계·상관분석 결과 저장
3. **분석 대시보드 → 시각화** → Chart.js 차트 표시 (**인사이트 요청 전에 가능**)
4. **(선택) 인사이트 요청** (`POST /api/insights`) → LM Studio 텍스트 설명

### 시각화 (Chart.js)

프론트엔드는 **Chart.js** + **react-chartjs-2**로 차트를 렌더링합니다 (`frontend/src/charts/`).

| 차트 타입 | 용도 |
|---|---|
| Bar | 히스토그램, 범주 빈도 |
| Line | 수치 분포 |
| Area | 수치 분포 (채움) |
| Pie | 범주 비율 |
| Scatter | 두 수치 변수 산점도 |
| Bubble | 산점도 + 포인트 크기 |
| Scale (로그 Y축) | 넓은 범위 분포 비교 |

차트 데이터는 `POST /api/plot-data`로 백엔드에서 가공되며, **시각화** 탭을 열 때 로드됩니다. 설정 패널의 **히스토그램 구간 수**, **바 차트 상위 N** 값이 반영됩니다.

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

프로젝트 루트에서:

| 파일 | 설명 |
|---|---|
| **`start-all.bat`** | 백엔드 + 프론트를 각각 새 cmd 창에서 실행, 브라우저 자동 열기 |
| `start-backend.bat` | 백엔드만 (포트 8000) |
| `start-frontend.bat` | 프론트만 (포트 5173) |

1. LM Studio에서 Local Server 시작 및 모델 로드
2. **이미 떠 있는** Backend/Frontend cmd 창이 있으면 모두 닫기 (포트 충돌 방지)
3. **`start-all.bat`** 더블클릭
4. **MyDataInsight Backend** / **MyDataInsight Frontend** 창에서 아래 메시지 확인
   - Backend: `Uvicorn running on http://127.0.0.1:8000`
   - Frontend: `VITE ... ready` / `Local: http://127.0.0.1:5173/`
5. 브라우저가 자동으로 열리며, 없으면 **http://127.0.0.1:5173** 접속

**경로 수정:** 탐색기에서 실행 시 PATH에 `uvicorn`이 없을 수 있어, `start-backend.bat`은 `python -m uvicorn`과 Python **전체 경로**를 사용합니다.

| 파일 | 변수 | 기본값 (본인 PC에 맞게 수정) |
|---|---|---|
| `start-backend.bat` | `PY` | `C:\Users\jjogaeo\anaconda3\python.exe` |
| `start-frontend.bat` | `NPM` | `C:\Program Files\nodejs\npm.cmd` |

`start-all.bat`은 위 두 파일을 `call`로 실행만 합니다. `PY`/`NPM`은 각각 `start-backend.bat`, `start-frontend.bat` 상단에서 수정하세요. 파일이 없으면 `where python` / `where npm.cmd`로 자동 탐색합니다.

**종료:** 백엔드·프론트 cmd 창에서 **Ctrl+C** 또는 창 닫기. `start-all.bat` 런처 창의 아무 키는 **런처만** 닫습니다 (서버는 계속 실행).

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

LM Studio 앱에서 **Local Server**를 켜고 (`localhost:1234`), 웹앱 **설정** 패널에서 모델을 선택한 뒤 인사이트를 요청합니다.

## API

| 엔드포인트 | 설명 |
|---|---|
| `GET /api/health` | 백엔드 상태 확인 |
| `GET /api/models` | LM Studio 모델 목록 |
| `POST /api/upload` | CSV 업로드 및 메타정보 반환 |
| `POST /api/analyze` | 선택 컬럼 EDA (전체 N행 기준) |
| `POST /api/plot-data` | 차트 데이터 가공 (histogram / bar / scatter) |
| `POST /api/insights` | LLM 인사이트 생성 (`model` 필드 필수) |

## 참고

- 통계/상관분석은 **백엔드에서 전체 데이터 기준**으로 계산합니다.
- **시각화 차트**는 EDA 완료 후 **시각화** 탭에서 바로 볼 수 있으며, 인사이트 요청과 **무관**합니다.
- 인사이트 요청 시 LM Studio에는 최대 100행 샘플만 전달되며, 프롬프트에 전체 행 수와 샘플 구분이 명시됩니다.
- 로컬 LLM 응답이 느릴 수 있어 Vite proxy(`vite.config.ts`) 및 `lmstudio_client.py` httpx timeout은 **600초(10분)** 로 설정되어 있습니다.
- 화면 하단 **디버그 로그** 패널에서 fetch 요청 상태(시간, URL, pending/success/error, 소요 ms)를 확인할 수 있습니다.
- `Churn` 컬럼의 `True.`/`False.` 형태 불리언 값은 정규화 후 처리됩니다.

## 문제 해결

| 증상 | 확인 / 조치 |
|---|---|
| `파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다` | `start-all.bat` 최신 버전인지 확인. Backend/Frontend 창에 에러가 있으면 `start-backend.bat` / `start-frontend.bat`을 각각 단독 실행해 메시지 확인 |
| `'uvicorn'은(는) 내부 또는 외부 명령이 아닙니다` | `start-backend.bat`의 `PY` 경로 수정, 또는 `pip install -r requirements.txt` |
| `'npm'은(는) ...` | Node.js 설치 후 `start-frontend.bat`의 `NPM` 경로 확인 |
| 포트 사용 중 (`10048`, `Port 5173 is in use`) | 기존 Backend/Frontend cmd 창 종료. `netstat -ano \| findstr :8000` / `:5173`으로 점유 프로세스 확인 |
| 백엔드 연결 안 됨 | http://127.0.0.1:8000/api/health → `{"status":"ok"}` 인지 확인 |
| 인사이트 실패 / 오프라인 | LM Studio Local Server(`localhost:1234`) 실행, 모델 로드, 설정 패널에서 모델 선택 |
| 요청이 중간에 끊김 | 디버그 로그 패널에서 어느 단계에서 실패했는지 확인. LM Studio 응답 지연 시 최대 10분까지 대기 |
