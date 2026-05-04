// src/ui/components/ui.tsx

import { PropsWithChildren } from "react";

export function Card({ children }: PropsWithChildren) {
  return <section style={cardStyle}>{children}</section>;
}

export function CardTitle({ children }: PropsWithChildren) {
  return <h2 style={cardTitleStyle}>{children}</h2>;
}

export function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  const disabled = !!props.disabled;

  return (
    <button
      {...props}
      style={{
        ...primaryButtonStyle,
        ...(disabled ? disabledPrimaryButtonStyle : null),
        ...props.style,
      }}
    />
  );
}

export function SecondaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  const disabled = !!props.disabled;

  return (
    <button
      {...props}
      style={{
        ...secondaryButtonStyle,
        ...(disabled ? disabledSecondaryButtonStyle : null),
        ...props.style,
      }}
    />
  );
}

export function Field({
  label,
  children,
}: PropsWithChildren<{ label: string }>) {
  return (
    <label style={fieldStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </label>
  );
}

export function StatPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div style={statPillStyle}>
      <strong style={statPillValueStyle}>{value}</strong>
      <span style={statPillLabelStyle}>{label}</span>
    </div>
  );
}

export const inputStyle: React.CSSProperties = {
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

export const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: "120px",
  resize: "vertical",
  paddingTop: "14px",
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "22px",
  padding: "18px",
  boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
  marginBottom: "14px",
};

const cardTitleStyle: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: "1.1rem",
  fontWeight: 800,
  lineHeight: 1.2,
  color: "#111827",
};

const primaryButtonStyle: React.CSSProperties = {
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

const disabledPrimaryButtonStyle: React.CSSProperties = {
  opacity: 0.55,
  cursor: "not-allowed",
};

const secondaryButtonStyle: React.CSSProperties = {
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

const disabledSecondaryButtonStyle: React.CSSProperties = {
  opacity: 0.55,
  cursor: "not-allowed",
};

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
  marginBottom: "14px",
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: "0.92rem",
  fontWeight: 700,
  color: "#1f2937",
  lineHeight: 1.2,
};

const statPillStyle: React.CSSProperties = {
  padding: "14px",
  borderRadius: "18px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  display: "grid",
  gap: "4px",
  textAlign: "center",
};

const statPillValueStyle: React.CSSProperties = {
  fontSize: "1.2rem",
  fontWeight: 800,
  color: "#111827",
};

const statPillLabelStyle: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "#6b7280",
  fontWeight: 600,
};