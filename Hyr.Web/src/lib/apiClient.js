import axios from "axios";

const apiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

const apiClient = axios.create({
  baseURL: apiBaseUrl,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && !config.headers?.Authorization) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  config.metadata = { startTime: performance.now() };
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    logApiTiming(response.config, response.status);
    return response;
  },
  (error) => {
    logApiTiming(error?.config, error?.response?.status, true);
    return Promise.reject(error);
  }
);

export default apiClient;

function normalizeApiBaseUrl(baseUrl) {
  if (typeof baseUrl !== "string") {
    return "";
  }

  const trimmedBaseUrl = baseUrl.trim();
  if (trimmedBaseUrl === "") {
    return "";
  }

  return trimmedBaseUrl.endsWith("/")
    ? trimmedBaseUrl.slice(0, -1)
    : trimmedBaseUrl;
}

function logApiTiming(config, status, isError = false) {
  const startTime = config?.metadata?.startTime;
  if (typeof startTime !== "number") {
    return;
  }

  const elapsedMs = performance.now() - startTime;
  const method = (config?.method ?? "get").toUpperCase();
  const url = `${config?.baseURL ?? ""}${config?.url ?? ""}`;
  const statusLabel = typeof status === "number" ? status : "NO_RESPONSE";
  const logFn = isError ? console.warn : console.info;

  logFn(`[API] ${method} ${url} responded ${statusLabel} in ${elapsedMs.toFixed(4)} ms`);
}
