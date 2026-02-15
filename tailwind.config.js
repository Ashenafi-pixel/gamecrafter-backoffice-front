/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        // Backgrounds
        surface: {
          DEFAULT: "#0E1116",
          raised: "#151A21",
          overlay: "#1B222C",
        },
        // Primary accent (buttons, highlights)
        accent: {
          DEFAULT: "#4C9AFF",
          hover: "#6BABFF",
          muted: "rgba(76, 154, 255, 0.12)",
        },
        // Semantic
        success: "#1FBF75",
        warning: "#F5A623",
        danger: "#E5484D",
        // Text (prefix with 'fg-' to avoid clashing with Tailwind text-* utilities)
        "fg-primary": "#E6EDF3",
        "fg-secondary": "#9AA4B2",
        "fg-muted": "#6E7681",
        // Border color (use 'edge' to avoid overriding theme.border)
        edge: {
          DEFAULT: "rgba(255, 255, 255, 0.06)",
          strong: "rgba(255, 255, 255, 0.1)",
        },
      },
      borderRadius: {
        card: "6px",
        button: "6px",
        input: "6px",
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255, 255, 255, 0.03)",
        dropdown: "0 8px 24px rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
};
