import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../utils/api';

export default function ReportCitasProximas() {
  const todayIso = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }, []);

  const plus7Iso = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 7);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }, []);

  const [fechaDesde, setFechaDesde] = useState(todayIso);
  const [fechaHasta, setFechaHasta] = useState(plus7Iso);
  const [especialidadId, setEspecialidadId] = useState('');
  const [terapeutaId, setTerapeutaId] = useState('');
  const [tipoSesionId, setTipoSesionId] = useState('');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [especialidades, setEspecialidades] = useState([]);
  const [terapeutas, setTerapeutas] = useState([]);
  const [tiposSesion, setTiposSesion] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  const labelFullName = (t) =>
    `${t.nombres ?? t.Nombres ?? ''} ${t.apellidos ?? t.Apellidos ?? ''}`.trim() || 'Sin nombre';

  function buildQuery() {
    const params = new URLSearchParams();
    params.set('fechaDesde', fechaDesde);
    params.set('fechaHasta', fechaHasta);
    if (especialidadId) params.set('especialidadId', especialidadId);
    if (terapeutaId) params.set('terapeutaId', terapeutaId);
    if (tipoSesionId) params.set('tipoSesionId', tipoSesionId);
    return params.toString();
  }

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const qs = buildQuery();
      const res = await apiFetch(`/api/reportes/citas-proximas?${qs}`);
      const list = res?.citas ?? res?.data ?? res?.items ?? [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.message || String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function exportPdf() {
    try {
      setError(null);
      const qs = buildQuery();
      const resp = await fetch(`/api/reportes/citas-proximas/export-pdf?${qs}`, { method: 'GET' });
      if (!resp.ok) throw new Error('No se pudo generar el PDF');
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CitasProximas_${fechaDesde}_${fechaHasta}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.message || String(e));
    }
  }

  async function loadFilters() {
    try {
      setLoadingFilters(true);
      setError(null);
      const [esp, ter, tipos] = await Promise.all([
        apiFetch('/api/Especialidades'),
        apiFetch('/api/Terapeutas?page=1&pageSize=200'),
        apiFetch('/api/TipoSesiones'),
      ]);
      setEspecialidades(esp?.items ?? esp ?? []);
      setTerapeutas(ter?.items ?? ter ?? []);
      setTiposSesion(tipos?.items ?? tipos ?? []);
    } catch (e) {
      setError((prev) => prev ?? e?.message ?? String(e));
    } finally {
      setLoadingFilters(false);
    }
  }

  useEffect(() => {
    loadFilters();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h2>Citas Próximas</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            Desde:{' '}
            <input
              type="date"
              className="input"
              value={fechaDesde}
              min={todayIso}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </label>
          <label>
            Hasta:{' '}
            <input
              type="date"
              className="input"
              value={fechaHasta}
              min={fechaDesde}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </label>

          <select
            className="input"
            value={especialidadId}
            onChange={(e) => setEspecialidadId(e.target.value)}
            style={{ minWidth: 160 }}
            disabled={loadingFilters}
          >
            <option value="">Todas las especialidades</option>
            {especialidades.map((esp) => (
              <option key={esp.id ?? esp.Id} value={esp.id ?? esp.Id}>
                {esp.nombre ?? esp.Nombre ?? '—'}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={terapeutaId}
            onChange={(e) => setTerapeutaId(e.target.value)}
            style={{ minWidth: 180 }}
            disabled={loadingFilters}
          >
            <option value="">Todos los terapeutas</option>
            {terapeutas.map((t) => (
              <option key={t.id ?? t.Id} value={t.id ?? t.Id}>
                {labelFullName(t)}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={tipoSesionId}
            onChange={(e) => setTipoSesionId(e.target.value)}
            style={{ minWidth: 170 }}
            disabled={loadingFilters}
          >
            <option value="">Todos los tipos de sesión</option>
            {tiposSesion.map((ts) => (
              <option key={ts.id ?? ts.Id} value={ts.id ?? ts.Id}>
                {ts.nombre ?? ts.Nombre ?? '—'}
              </option>
            ))}
          </select>

          <button className="btn" onClick={load} disabled={loading}>
            {loading ? 'Cargando…' : 'Buscar'}
          </button>
          <button className="btn secondary" onClick={exportPdf} disabled={loading}>
            Exportar PDF
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {loading && <div className="muted">Cargando...</div>}
        {error && <div className="error">Error: {error}</div>}
        {!loading && !error && (
          <table className="table pastel">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Paciente</th>
                <th>Especialidad</th>
                <th>Tipo Sesión</th>
                <th>Terapeuta</th>
                <th>Responsable</th>
                <th>Teléfono</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center' }}>
                    Sin registros en el rango.
                  </td>
                </tr>
              )}
              {items.map((c) => {
                const fecha = c.Fecha || c.fecha;
                const fechaObj = fecha ? new Date(fecha) : null;
                const fechaStr = fechaObj ? fechaObj.toLocaleDateString() : '—';
                const horaStr = fechaObj ? fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
                return (
                  <tr key={c.CitaId ?? c.Id ?? c.id ?? JSON.stringify(c)}>
                    <td>{fechaStr}</td>
                    <td>{horaStr}</td>
                    <td>{c.PacienteNombre ?? c.pacienteNombre ?? '—'}</td>
                    <td>{c.Especialidad ?? c.especialidad ?? c.EspecialidadNombre ?? '—'}</td>
                    <td>{c.TipoSesion ?? c.tipoSesion ?? c.TipoSesionNombre ?? '—'}</td>
                    <td>{c.TerapeutaNombre ?? c.terapeutaNombre ?? '—'}</td>
                    <td>{c.ResponsableNombre ?? c.responsableNombre ?? '—'}</td>
                    <td>{c.ResponsableTelefono ?? c.responsableTelefono ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
