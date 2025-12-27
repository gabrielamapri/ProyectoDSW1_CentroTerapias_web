import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../utils/api';

export default function ReportHistorialCitas() {
  // Utilidad para ISO local (yyyy-MM-dd) en medianoche local
  const isoLocal = (d) => {
    const atMidnight = new Date(d);
    atMidnight.setHours(0, 0, 0, 0);
    const local = new Date(atMidnight.getTime() - atMidnight.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  // Ayer y hace 30 días
  const ayerIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return isoLocal(d);
  }, []);

  const hace30DiasIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 31); // 30 días antes de ayer
    return isoLocal(d);
  }, []);

  // Filtros
  const [fechaDesde, setFechaDesde] = useState(hace30DiasIso);
  const [fechaHasta, setFechaHasta] = useState(ayerIso);
  const [especialidadId, setEspecialidadId] = useState('');
  const [terapeutaId, setTerapeutaId] = useState('');
  const [tipoSesionId, setTipoSesionId] = useState('');
  const [estado, setEstado] = useState(''); // '', 'Scheduled', 'Completed', 'Cancelled'

  // Datos y métricas
  const [items, setItems] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, completadas: 0, canceladas: 0, noAsistio: 0 });

  // UI
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [error, setError] = useState(null);

  // Catálogos
  const [especialidades, setEspecialidades] = useState([]);
  const [terapeutas, setTerapeutas] = useState([]);
  const [tiposSesion, setTiposSesion] = useState([]);

  const labelFullName = (t) =>
    `${t.nombres ?? t.Nombres ?? ''} ${t.apellidos ?? t.Apellidos ?? ''}`.trim() || 'Sin nombre';

  // Validación simple de fechas en el front
  function validateDates() {
    try {
      const dDesde = new Date(fechaDesde);
      const dHasta = new Date(fechaHasta);
      const ayer = new Date();
      ayer.setHours(0, 0, 0, 0);
      ayer.setDate(ayer.getDate() - 1);

      const dDesde0 = new Date(dDesde); dDesde0.setHours(0, 0, 0, 0);
      const dHasta0 = new Date(dHasta); dHasta0.setHours(0, 0, 0, 0);

      if (dHasta0 > ayer) throw new Error('La fecha Hasta debe ser como máximo ayer.');
      if (dDesde0 > dHasta0) throw new Error('La fecha Desde no puede ser posterior a Hasta.');
      return true;
    } catch (e) {
      setError(e?.message || String(e));
      return false;
    }
  }

  function buildQuery() {
    const params = new URLSearchParams();
    params.set('fechaDesde', fechaDesde);
    params.set('fechaHasta', fechaHasta);
    if (especialidadId) params.set('especialidadId', especialidadId);
    if (terapeutaId) params.set('terapeutaId', terapeutaId);
    if (tipoSesionId) params.set('tipoSesionId', tipoSesionId);
    if (estado) params.set('estado', estado);
    params.set('page', '1');
    params.set('pageSize', '1000');
    return params.toString();
  }

  async function load() {
    if (!validateDates()) return;
    try {
      setLoading(true);
      setError(null);
      const qs = buildQuery();
      const res = await apiFetch(`/api/reportes/historial-citas?${qs}`);
      const list = res?.citas ?? res?.Citas ?? res?.data ?? res?.items ?? [];
      setItems(Array.isArray(list) ? list : []);

      setMetrics({
        total: res?.totalCitas ?? res?.TotalCitas ?? (Array.isArray(list) ? list.length : 0),
        completadas: res?.completadas ?? res?.Completadas ?? 0,
        canceladas: res?.canceladas ?? res?.Canceladas ?? 0,
        noAsistio: res?.noAsistio ?? res?.NoAsistio ?? 0,
      });
    } catch (e) {
      setError(e?.message || String(e));
      setItems([]);
      setMetrics({ total: 0, completadas: 0, canceladas: 0, noAsistio: 0 });
    } finally {
      setLoading(false);
    }
  }

  async function exportPdf() {
    if (!validateDates()) return;
    try {
      setError(null);
      const qs = buildQuery();
      const resp = await fetch(`/api/reportes/historial-citas/export-pdf?${qs}`, { method: 'GET' });
      if (!resp.ok) throw new Error('No se pudo generar el PDF');
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HistorialCitas_${fechaDesde}_${fechaHasta}.pdf`;
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

  // Límites para inputs de fecha
  const maxHasta = ayerIso; // Hasta como máximo ayer
  const maxDesde = fechaHasta; // Desde no puede superar Hasta

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h2>Historial de Citas</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            Desde:{' '}
            <input
              type="date"
              className="input"
              value={fechaDesde}
              max={maxDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </label>
          <label>
            Hasta:{' '}
            <input
              type="date"
              className="input"
              value={fechaHasta}
              max={maxHasta}
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

          <select
            className="input"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            style={{ minWidth: 160 }}
          >
            <option value="">Todos los estados</option>
            <option value="Scheduled">Programado</option>
            <option value="Completed">Completado</option>
            <option value="Cancelled">Cancelado</option>
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
        {loading && <div className="muted">Cargando</div>}
        {error && <div className="error">Error: {error}</div>}

        {!loading && !error && (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ background: '#e3eafe', color: '#1a237e', borderRadius: 8, padding: '12px 20px', minWidth: 120, textAlign: 'center', fontWeight: 600, boxShadow: '0 1px 4px #0001' }}>
                Total
                <div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.total}</div>
              </div>
              <div style={{ background: '#e8f5e9', color: '#256029', borderRadius: 8, padding: '12px 20px', minWidth: 120, textAlign: 'center', fontWeight: 600, boxShadow: '0 1px 4px #0001' }}>
                Completadas
                <div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.completadas}</div>
              </div>
              <div style={{ background: '#fffde7', color: '#bfa600', borderRadius: 8, padding: '12px 20px', minWidth: 120, textAlign: 'center', fontWeight: 600, boxShadow: '0 1px 4px #0001' }}>
                No asistió
                <div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.noAsistio}</div>
              </div>
              <div style={{ background: '#ffebee', color: '#b71c1c', borderRadius: 8, padding: '12px 20px', minWidth: 120, textAlign: 'center', fontWeight: 600, boxShadow: '0 1px 4px #0001' }}>
                Canceladas
                <div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.canceladas}</div>
              </div>
            </div>

            <table className="table pastel">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Especialidad</th>
                  <th>Tipo Sesión</th>
                  <th>Terapeuta</th>
                  <th>Estado</th>
                  <th>Motivo</th>
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
                  const fechaVal = c.Fecha ?? c.fecha;
                  const h = c.HoraInicio ?? c.horaInicio;
                  const m = c.MinutoInicio ?? c.minutoInicio;

                  const fechaObj = fechaVal ? new Date(fechaVal) : null;
                  const fechaStr = fechaObj ? fechaObj.toLocaleDateString() : '—';
                  const horaStr =
                    typeof h === 'number' && typeof m === 'number'
                      ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
                      : fechaObj
                      ? fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '—';

                  return (
                    <tr key={c.CitaId ?? c.citaId ?? c.Id ?? c.id ?? JSON.stringify(c)}>
                      <td>{fechaStr}</td>
                      <td>{horaStr}</td>
                      <td>{c.PacienteNombre ?? c.pacienteNombre ?? '—'}</td>
                      <td>{c.Especialidad ?? c.especialidad ?? c.EspecialidadNombre ?? '—'}</td>
                      <td>{c.TipoSesion ?? c.tipoSesion ?? c.TipoSesionNombre ?? '—'}</td>
                      <td>{c.TerapeutaNombre ?? c.terapeutaNombre ?? '—'}</td>
                      <td>{c.Estado ?? c.estado ?? '—'}</td>
                      <td>{c.Motivo ?? c.motivo ?? ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </section>
  );
}
