import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const host = env.VITE_DEV_HOST || undefined;
  const port = Number(env.VITE_DEV_PORT || env.FRONTEND_PORT || 5173);
  const proxyTarget = env.VITE_DEV_API_PROXY_TARGET || "";

  return {
    plugins: [react()],
    server: {
      ...(host ? { host } : {}),
      port,
      ...(proxyTarget ? { proxy: { "/api": { target: proxyTarget, changeOrigin: true } } } : {})
    },
    preview: {
      ...(host ? { host } : {}),
      port
    }
  };
});
