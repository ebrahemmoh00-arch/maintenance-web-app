import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

function originFromUrl(value) {
  try {
    return value ? new URL(value).origin : "";
  } catch {
    return "";
  }
}

function apiOrigins(env) {
  return [
    env.VITE_API_BASE_URL,
    env.VITE_API_BASE,
    env.VITE_DEV_API_PROXY_TARGET,
    ...(env.VITE_API_FALLBACK_BASES || "").split(",")
  ].map(item => originFromUrl(String(item || "").trim())).filter(Boolean);
}

function cspHeader(env, mode) {
  const connectSources = Array.from(new Set(["'self'", ...apiOrigins(env), "http:", "https:", "ws:", "wss:"])).join(" ");
  const scriptSources = mode === "production" ? "'self' 'unsafe-inline' blob:" : "'self' 'unsafe-inline' 'unsafe-eval' blob:";
  return [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: http: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
    "media-src 'self' data: blob:",
    "frame-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'"
  ].join("; ");
}

function securityHeaders(env, mode) {
  return {
    "Content-Security-Policy": cspHeader(env, mode),
    "X-Frame-Options": "SAMEORIGIN",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)"
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const host = env.VITE_DEV_HOST || undefined;
  const port = Number(env.VITE_DEV_PORT || env.FRONTEND_PORT || 5173);
  const proxyTarget = env.VITE_DEV_API_PROXY_TARGET || "";
  const headers = securityHeaders(env, mode);

  return {
    plugins: [react()],
    server: {
      ...(host ? { host } : {}),
      port,
      headers,
      ...(proxyTarget ? { proxy: { "/api": { target: proxyTarget, changeOrigin: true } } } : {})
    },
    preview: {
      ...(host ? { host } : {}),
      port,
      headers
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.js",
      css: true,
      coverage: {
        provider: "v8",
        reporter: ["text", "json-summary"],
        reportsDirectory: "coverage",
        include: ["src/**/*.{js,jsx}"],
        exclude: [
          "src/main.jsx",
          "src/test/**",
          "src/**/*.test.{js,jsx}"
        ]
      }
    }
  };
});
