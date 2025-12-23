import React from "react";

export default function Modal({ children, onClose, title }) {
  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <strong style={{ color: '#0b5394' }}>{title}</strong>
          <button onClick={onClose} aria-label="Cerrar" style={closeBtnStyle}>✕</button>
        </div>
        <div style={{ marginTop: 12 }}>{children}</div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999
};

const modalStyle = {
  background: "#fff",
  padding: 18,
  borderRadius: 10,
  minWidth: 360,
  maxWidth: "92%",
  boxShadow: "0 14px 40px rgba(0,0,0,0.25)",
  border: "1px solid #e6eef8"
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12
};

const closeBtnStyle = {
  background: "transparent",
  border: "none",
  fontSize: 18,
  cursor: "pointer",
  color: "#666"
};
