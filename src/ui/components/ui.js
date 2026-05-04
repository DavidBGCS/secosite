import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/ui/components/ui.tsx
import { PropsWithChildren } from "react";
export function Card({ children }) {
    return _jsx("section", { style: cardStyle, children: children });
}
export function CardTitle({ children }) {
    return _jsx("h2", { style: cardTitleStyle, children: children });
}
export function PrimaryButton(props) {
    const disabled = !!props.disabled;
    return (_jsx("button", { ...props, style: {
            ...primaryButtonStyle,
            ...(disabled ? disabledPrimaryButtonStyle : null),
            ...props.style,
        } }));
}
export function SecondaryButton(props) {
    const disabled = !!props.disabled;
    return (_jsx("button", { ...props, style: {
            ...secondaryButtonStyle,
            ...(disabled ? disabledSecondaryButtonStyle : null),
            ...props.style,
        } }));
}
export function Field({ label, children, }) {
    return (_jsxs("label", { style: fieldStyle, children: [_jsx("span", { style: fieldLabelStyle, children: label }), children] }));
}
export function StatPill({ label, value, }) {
    return (_jsxs("div", { style: statPillStyle, children: [_jsx("strong", { style: statPillValueStyle, children: value }), _jsx("span", { style: statPillLabelStyle, children: label })] }));
}
export const inputStyle = {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "16px",
    border: "1.5px solid #cbd5e1",
    background: "#ffffff",
    color: "#111827",
    fontSize: "1rem",
    fontWeight: 500,
    lineHeight: 1.4,
    minHeight: "52px",
    boxSizing: "border-box",
    outline: "none",
    WebkitTextFillColor: "#111827",
    appearance: "none",
};
export const textareaStyle = {
    ...inputStyle,
    minHeight: "120px",
    resize: "vertical",
    paddingTop: "14px",
};
const cardStyle = {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "22px",
    padding: "18px",
    boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
    marginBottom: "14px",
};
const cardTitleStyle = {
    margin: "0 0 14px",
    fontSize: "1.1rem",
    fontWeight: 800,
    lineHeight: 1.2,
    color: "#111827",
};
const primaryButtonStyle = {
    padding: "14px 16px",
    borderRadius: "16px",
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: "0.98rem",
    minHeight: "52px",
    boxSizing: "border-box",
    width: "100%",
};
const disabledPrimaryButtonStyle = {
    opacity: 0.55,
    cursor: "not-allowed",
};
const secondaryButtonStyle = {
    padding: "14px 16px",
    borderRadius: "16px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "0.98rem",
    minHeight: "52px",
    boxSizing: "border-box",
    width: "100%",
};
const disabledSecondaryButtonStyle = {
    opacity: 0.55,
    cursor: "not-allowed",
};
const fieldStyle = {
    display: "grid",
    gap: "8px",
    marginBottom: "14px",
};
const fieldLabelStyle = {
    fontSize: "0.92rem",
    fontWeight: 700,
    color: "#1f2937",
    lineHeight: 1.2,
};
const statPillStyle = {
    padding: "14px",
    borderRadius: "18px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    display: "grid",
    gap: "4px",
    textAlign: "center",
};
const statPillValueStyle = {
    fontSize: "1.2rem",
    fontWeight: 800,
    color: "#111827",
};
const statPillLabelStyle = {
    fontSize: "0.8rem",
    color: "#6b7280",
    fontWeight: 600,
};
