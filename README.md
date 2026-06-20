# MyDataInsight

EXAONE3.5:7.8b(Ollama) 기반 CSV 데이터 분석 웹 애플리케이션입니다.

## 구조

- `frontend/` — React 18 + Vite + TypeScript + Tailwind + Zustand + Recharts
- `backend/` — FastAPI + pandas (통계/상관분석/차트 데이터/EXAONE 프록시)

## 실행 방법

### 1. 백엔드

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 http://localhost:5173 접속

### 3. Ollama (EXAONE 인사이트용)

```bash
ollama pull exaone3.5:7.8b
ollama serve
```

## API

| 엔드포인트 | 설명 |
|---|---|
| `POST /api/upload` | CSV 업로드 및 메타정보 반환 |
| `POST /api/analyze` | 선택 컬럼 EDA (전체 N행 기준) |
| `POST /api/plot-data` | 차트 데이터 가공 |
| `POST /api/insights` | EXAONE 인사이트 생성 (`/api/gpt` 대체) |

## 참고

- 통계/상관분석은 **백엔드에서 전체 데이터 기준**으로 계산합니다.
- EXAONE에는 최대 100행 샘플만 전달되며, 프롬프트에 전체 행 수와 샘플 구분이 명시됩니다.
- `Churn` 컬럼의 `True.`/`False.` 형태 불리언 값은 정규화 후 처리됩니다.
