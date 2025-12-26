import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';

const styles = {
  container: { maxWidth: 700, margin: '0 auto', padding: 24, fontFamily: 'Inter, Arial, sans-serif', color: '#222' },
  title: { marginBottom: 18, color: '#2b2b2b', fontSize: 28, fontWeight: 700, textAlign: 'center' },
  selectRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 },
  label: { fontWeight: 600, color: '#374151', fontSize: 16 },
  select: { padding: '8px 12px', borderRadius: 8, border: '1px solid #e6e9ef', fontSize: 15, background: '#f7faff', color: '#244266', outline: 'none' },
  noCitas: { color: '#8a1f1f', background: '#ffe6e6', padding: 10, borderRadius: 8, textAlign: 'center', marginTop: 12 },
  cardsGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: 18, marginTop: 10 },
  citaCard: { background: 'linear-gradient(90deg,#e3f0ff,#f7eaff)', borderRadius: 12, boxShadow: '0 4px 18px rgba(88,120,190,0.10)', padding: 18, border: '1px solid #e6e9ef', display: 'flex', flexDirection: 'column', gap: 8 },
  citaInfo: { fontSize: 16, color: '#2f3640' },
  estadoCompletada: { background: '#dff7e7', color: '#215a36', padding: '2px 10px', borderRadius: 999, fontWeight: 600, border: '1px solid #c6ebd4' },
  estadoNoAsistio: { background: '#ffe6e6', color: '#8a1f1f', padding: '2px 10px', borderRadius: 999, fontWeight: 600, border: '1px solid #f7c6c6' },
  estadoProgramada: { background: '#e6f4ff', color: '#1f4b6e', padding: '2px 10px', borderRadius: 999, fontWeight: 600, border: '1px solid #d6e9ff' },
  btnRow: { display: 'flex', gap: 10, marginTop: 8 },
  btn: { padding: '8px 14px', borderRadius: 7, fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 15 },
  btnPrimary: { background: 'linear-gradient(90deg,#8ab6f9,#b9e0ff)', color: '#244266', border: '1px solid #cfe2ff', boxShadow: '0 2px 8px rgba(88,120,190,0.10)' },
  btnGhost: { background: '#fff', color: '#6c6c6c', border: '1px solid #e0e0e0' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(44, 62, 80, 0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalCard: { background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: 28, minWidth: 340, maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 14 },
  modalTitle: { margin: 0, color: '#244266', fontSize: 20, fontWeight: 700 },
  textarea: { minHeight: 80, borderRadius: 8, border: '1px solid #e6e9ef', padding: 10, fontSize: 15, background: '#f7faff', color: '#244266', resize: 'vertical', marginBottom: 8 }
};

function CitasTerapeuta() {
  const [terapeutas, setTerapeutas] = useState([]);
  const [terapeutaId, setTerapeutaId] = useState('');
  const [citas, setCitas] = useState([]);
  const [nota, setNota] = useState('');
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = (user?.role || localStorage.getItem('userRole') || '').toLowerCase();
  const isTerapeuta = userRole === 'terapeuta';
  const authenticatedTerapeutaId = user?.terapeutaId || (() => {
  try {
    const token = localStorage.getItem('ct_token') || localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || null;
  } catch { return null; }
})();

  useEffect(() => {
    apiFetch('/api/terapeutas')
      .then(data => setTerapeutas(data))
      .catch(() => setTerapeutas([]));
  }, []);

  useEffect(() => {
    if (isTerapeuta && authenticatedTerapeutaId) {
      setTerapeutaId(String(authenticatedTerapeutaId));
    }
  }, [isTerapeuta, authenticatedTerapeutaId]);

  useEffect(() => {
    if (terapeutaId) {
      apiFetch(`/api/citas/terapeuta/${terapeutaId}`)
        .then(data => setCitas(data))
        .catch(() => setCitas([]));
    } else {
      setCitas([]);
    }
  }, [terapeutaId]);

  const handleCompletar = (cita) => {
    setCitaSeleccionada(cita);
    setNota('');
  };

  const handleGuardarNota = async () => {
    await apiFetch('/api/notassesion', {
      method: 'POST',
      body: {
        citaId: citaSeleccionada.id,
        terapeutaId: terapeutaId,
        notas: nota
      }
    });
    await apiFetch(`/api/citas/${citaSeleccionada.id}`, {
      method: 'PUT',
      body: {
        estado: 'Completada',
        notas: nota
      }
    });
    setNota('');
    setCitaSeleccionada(null);
    apiFetch(`/api/citas/terapeuta/${terapeutaId}`)
      .then(data => setCitas(data))
      .catch(() => setCitas([]));
  };

  const handleNoAsistio = async (cita) => {
    await apiFetch(`/api/citas/${cita.id}`, {
      method: 'PUT',
      body: {
        estado: 'NoAsistio',
        notas: cita.notas || ''
      }
    });
    apiFetch(`/api/citas/terapeuta/${terapeutaId}`)
      .then(data => setCitas(data))
      .catch(() => setCitas([]));
  };

  const isCompletada = (estado) =>
    estado === 'Completada' || estado === 'Completed';

  const isProgramada = (estado) =>
    estado === 'Programada' || estado === 'Scheduled';
console.log('authenticatedTerapeutaId:', authenticatedTerapeutaId);
console.log('terapeutas ids:', terapeutas.map(t => t.id));
console.log('terapeutas:', terapeutas);
  const terapeutaAutenticado = terapeutas.find(
    t => String(t.id) === String(authenticatedTerapeutaId)
  );

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Mis Citas</h2>
      <div style={styles.selectRow}>
        <label style={styles.label}>Terapeuta:</label>
        {isTerapeuta ? (
          terapeutas.length === 0 ? (
            <span style={{ fontWeight: 600, fontSize: 16, color: '#244266' }}>
              Cargando...
            </span>
          ) : terapeutaAutenticado ? (
            <span style={{ fontWeight: 600, fontSize: 16, color: '#244266' }}>
              {terapeutaAutenticado.nombres} {terapeutaAutenticado.apellidos}
            </span>
          ) : (
            <span style={{ fontWeight: 600, fontSize: 16, color: '#8a1f1f' }}>
              No encontrado
            </span>
          )
        ) : (
          <select
            value={terapeutaId}
            onChange={e => setTerapeutaId(e.target.value)}
            style={styles.select}
          >
            <option value="">-- Seleccione --</option>
            {terapeutas.map(t => (
              <option key={t.id} value={t.id}>
                {t.nombres} {t.apellidos}
              </option>
            ))}
          </select>
        )}
      </div>
      {terapeutaId && citas.length === 0 && <p style={styles.noCitas}>No hay citas para este terapeuta.</p>}
      <div style={styles.cardsGrid}>
        {citas.map(cita => (
          <div key={cita.id} style={styles.citaCard}>
            <div style={styles.citaInfo}><strong>Paciente:</strong> {cita.pacienteNombre}</div>
            <div style={styles.citaInfo}><strong>Fecha:</strong> {cita.fecha}</div>
            <div style={styles.citaInfo}>
              <strong>Estado:</strong>{' '}
              <span style={
                isCompletada(cita.estado)
                  ? styles.estadoCompletada
                  : cita.estado === 'NoAsistio'
                  ? styles.estadoNoAsistio
                  : styles.estadoProgramada
              }>
                {cita.estado}
              </span>
            </div>
            <div style={styles.btnRow}>
              <button
                style={{ ...styles.btn, ...styles.btnPrimary }}
                onClick={() => handleCompletar(cita)}
                disabled={!isProgramada(cita.estado)}
              >
                Completar
              </button>
              {isProgramada(cita.estado) && (
                <button
                  style={{ ...styles.btn, ...styles.btnGhost }}
                  onClick={() => handleNoAsistio(cita)}
                  disabled={!isProgramada(cita.estado)}
                >
                  No asistió
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {citaSeleccionada && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3 style={styles.modalTitle}>Nota de sesión para {citaSeleccionada.pacienteNombre}</h3>
            <textarea value={nota} onChange={e => setNota(e.target.value)} style={styles.textarea} placeholder="Escribe la nota de la sesión..." />
            <div style={styles.btnRow}>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleGuardarNota}>Guardar y completar</button>
              <button style={{ ...styles.btn, ...styles.btnGhost }} onClick={() => setCitaSeleccionada(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CitasTerapeuta;
