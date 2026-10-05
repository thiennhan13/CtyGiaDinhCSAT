import nextConfig from "eslint-config-next";

/** @type {import('eslint').Linter.Config[]} */
const config = [
  // ── Ignore patterns ────────────────────────────────────────
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "node_modules/**",
      "docs/**",
      "scratch/**",
      "internal/**",
      "private-data/**",
      "backups/**",
      "exports/**",
      "artifacts/**",
      "test-results/**",
      "playwright-report/**",
      ".agents/**",
      ".codex/**",
      ".aws/**",
      ".ssh/**",
      ".idea/**",
      ".vscode/**",
      "*.tsbuildinfo",
      "database/**",
      "public/**",
    ],
  },

  // ── Next.js 16 Flat Config (recommended rules) ─────────────
  // eslint-config-next@16 exports a flat config array trực tiếp
  ...(Array.isArray(nextConfig) ? nextConfig : [nextConfig]),

  // ── Project-level overrides ───────────────────────────────
  {
    rules: {
      // Đã xem xét thủ công — tắt các rule gây false-positive trong Next.js

      // useEffect → setState là pattern chuẩn để load data lần đầu trong Client Components
      "react-hooks/set-state-in-effect": "off",
      // Giữ chính sách exhaustive-deps hiện tại; việc bật lại cần một đợt rà soát hooks riêng.
      "react-hooks/exhaustive-deps": "off",
      // Bỏ qua rule về impure functions trong useState init (Date.now() cho key generation)
      "react-hooks/purity": "off",
      // Cho phép các ký tự "" trong JSX string (cần thiết với văn bản tiếng Việt)
      "react/no-unescaped-entities": "off",
      // Không cần import React trong Next.js 15+
      "react/react-in-jsx-scope": "off",
      // Bỏ qua comment-in-jsx detection (false-positive với long lines)
      "react/jsx-no-comment-textnodes": "off",
    },
  },
];


export default config;
