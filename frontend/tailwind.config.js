export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#14171b",
        panel2: "#1b2026",
        line: "#2f3944",
        ink: "#f3f6f8",
        muted: "#9aa7b4",
        signal: "#2dd4bf",
        warn: "#f59e0b",
        danger: "#ef4444"
      },
      boxShadow: {
        scada: "0 18px 45px rgba(0,0,0,0.32)"
      }
    }
  },
  plugins: []
};
