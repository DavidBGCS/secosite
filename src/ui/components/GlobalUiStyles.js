import { jsx as _jsx } from "react/jsx-runtime";
// src/ui/components/GlobalUiStyles.tsx
export function GlobalUiStyles() {
    return (_jsx("style", { children: `
        input,
        textarea,
        select,
        button {
          font: inherit;
        }

        input,
        textarea,
        select {
          color: #111827 !important;
          caret-color: #111827 !important;
        }

        input::placeholder,
        textarea::placeholder {
          color: #94a3b8 !important;
          opacity: 1 !important;
        }

        input:focus,
        textarea:focus,
        select:focus {
          outline: none !important;
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16) !important;
          background: #ffffff !important;
          color: #111827 !important;
        }

        input:disabled,
        textarea:disabled,
        select:disabled,
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed !important;
        }

        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        textarea:-webkit-autofill,
        textarea:-webkit-autofill:hover,
        textarea:-webkit-autofill:focus,
        select:-webkit-autofill,
        select:-webkit-autofill:hover,
        select:-webkit-autofill:focus {
          -webkit-text-fill-color: #111827 !important;
          box-shadow: 0 0 0px 1000px #ffffff inset !important;
          transition: background-color 9999s ease-in-out 0s;
        }

        button {
          transition: transform 0.06s ease, box-shadow 0.12s ease, background 0.12s ease, border-color 0.12s ease;
        }

        button:active:not(:disabled) {
          transform: translateY(1px);
        }
      ` }));
}
