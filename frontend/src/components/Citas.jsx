import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'

export default function Citas() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiFetch('/api/citas')
      .then(raw => {
        console.debug('[Citas] raw response', raw)
        const list = Array.isArray(raw) ? raw : (raw && raw.value) ? raw.value : []
        // Normalizar la respuesta para renderizar de forma consistente
        const normalized = (list || []).map(c => {
          const fecha = c.fechaInicio ?? c.fecha ?? c.fechaHora ?? c.FechaInicio ?? c.Fecha
          const pacienteNombre =
            c.pacienteNombre ??
            (c.paciente ? ((c.paciente.nombres || c.paciente.Nombre || c.paciente.nombre || '').trim() + ' ' + (c.paciente.apellidos || c.paciente.Apellidos || c.paciente.apellido || '').trim()).trim() : null) ??
            c.paciente?.nombre ??
            c.paciente?.Nombre ??
            '—'
          const terapeutaNombre =
            c.terapeutaNombre ??
            (c.terapeuta ? ((c.terapeuta.nombres || c.terapeuta.Nombre || c.terapeuta.nombre || '').trim() + ' ' + (c.terapeuta.apellidos || c.terapeuta.Apellidos || c.terapeuta.apellido || '').trim()).trim() : null) ??
            c.terapeuta?.nombre ??
            c.terapeuta?.Nombre ??
            '—'
          const tipoSesionNombre =
            c.tipoSesionNombre ?? c.tipoSesion?.nombre ?? c.tipoSesion?.Nombre ?? c.tipoSesion?.name ?? '—'
          const duracion = c.duracionMinutos ?? c.duracion ?? c.DuracionMinutos ?? c.tipoSesion?.duracionMinutos ?? '—'
          const precio = (c.precio ?? c.Precio ?? c.tipoSesion?.precio) ?? null
          const estado = c.estado ?? c.estadoCita ?? c.Estado ?? 'Pendiente'
          const observaciones = c.observaciones ?? c.descripcion ?? c.Observaciones ?? c.Observacion ?? c.notas ?? ''

          return {
            id: c.id ?? c.Id ?? c.citaId ?? null,
            fecha,
            pacienteNombre,
            pacienteId: c.pacienteId ?? c.PacienteId ?? c.paciente?.id,
            terapeutaNombre,
            terapeutaId: c.terapeutaId ?? c.TerapeutaId ?? c.terapeuta?.id,
            tipoSesionNombre,
            tipoSesionId: c.tipoSesionId ?? c.TipoSesionId ?? c.tipoSesion?.id,
            duracion,
            precio,
            estado,
            observaciones,
            raw: c
          }
        })
        console.debug('[Citas] normalized', { count: normalized.length, sample: normalized[0] })
        setItems(normalized)
      })
      .catch((e) => setError(e.message || String(e)))
  }, [])

  if (error) return <div className="error">Error: {error}</div>
  if (!items) return <div className="card"><div className="spinner" /></div>
  if (items.length === 0) return <div className="card">No hay citas</div>

  function handleView(item) {
    alert('Ver cita: ' + (item.id ?? JSON.stringify(item)))
  }
  function handleEdit(item) {
    alert('Editar cita: ' + (item.id ?? JSON.stringify(item)))
  }
  function handleCancel(item) {
    if (!confirm('Cancelar cita?')) return
    // Reemplaza por la llamada real a la API cuando quieras:
    // await apiFetch(`/api/citas/${item.id}`, { method: 'DELETE' })
    alert('Cancelar cita (demo): ' + (item.id ?? JSON.stringify(item)))
  }

  return (
    <section>
      <h2>Citas</h2>
      <div style={{marginTop:12}}>
        {items.map((c) => (
          <div className="card" key={c.id ?? JSON.stringify(c)}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <h3 style={{margin:0}}>
                  {c.fecha ? new Date(c.fecha).toLocaleString() : 'Fecha pendiente'}
                </h3>
                <small className="muted">Paciente: {c.pacienteNombre}</small>
                <div style={{marginTop:6}}>
                  <small>Tipo sesión: {c.tipoSesionNombre}</small>
                </div>
              </div>

              <div style={{textAlign:'right'}}>
                <div>
                  <span className="status-pill">{String(c.estado)}</span>
                </div>
                <div style={{marginTop:8}}>
                  <button className="btn small" onClick={()=>handleView(c)}>Ver</button>
                  <button className="btn small" onClick={()=>handleEdit(c)} style={{marginLeft:6}}>Editar</button>
                  <button className="btn small ghost" onClick={()=>handleCancel(c)} style={{marginLeft:6}}>Cancelar</button>
                </div>
              </div>
            </div>

            <div style={{height:8}} />

            <div className="meta-row">
              <small>Terapeuta: {c.terapeutaNombre}</small>
              <small style={{marginLeft:12}}>Duración: {c.duracion} min</small>
              <small style={{marginLeft:12}}>Precio: {c.precio != null ? c.precio : '—'}</small>
            </div>

            {c.observaciones ? (
              <div style={{marginTop:8}}>
                <small>Observaciones: {c.observaciones}</small>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
