import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import {
  completeFetchLog,
  createFetchLogEntry,
  failFetchLog,
  parseFetchInput,
} from "./hooks/useDebugLog";
import { useAppStore } from "./store/useAppStore";
import "./index.css";

let fetchInterceptorInstalled = false;

function installFetchInterceptor() {
  if (fetchInterceptorInstalled || typeof window === "undefined") return;
  fetchInterceptorInstalled = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const { url, method } = parseFetchInput(input, init);
    const { id, startedAt } = createFetchLogEntry(url, method);

    let requestInit = init;

    if (url.includes("/api/insights") && method === "POST" && requestInit?.body) {
      const model = useAppStore.getState().selectedModel;
      if (model && typeof requestInit.body === "string") {
        try {
          const body = JSON.parse(requestInit.body) as Record<string, unknown>;
          body.model = model;
          requestInit = { ...requestInit, body: JSON.stringify(body) };
        } catch {
          // JSON 파싱 실패 시 원래 요청 그대로 전달
        }
      }
    }

    try {
      const response = await nativeFetch(input, requestInit);
      completeFetchLog(id, startedAt, response);
      return response;
    } catch (error) {
      failFetchLog(id, startedAt, error);
      throw error;
    }
  };
}

installFetchInterceptor();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
