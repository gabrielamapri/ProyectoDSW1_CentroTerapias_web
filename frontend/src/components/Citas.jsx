import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'

export default function Citas() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiFetch('/api/citas')
      .then(setItems)
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <div className="error">Error: {error}</div>
  if (!items) return <div className="card"><div className="spinner" /></div>

  return (
    <section>
      <h2>Citas</h2>
      <div className="list" style={{marginTop:12}}>
        {items.map((c) => (
          <div className="card" key={c.id || JSON.stringify(c)}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                <h3 style={{margin:0}}>{c.fecha ? new Date(c.fecha).toLocaleString() : 'Fecha pendiente'}</h3>
                <small className="muted">Paciente: {c.pacienteNombre || c.paciente || '—'}</small>
                <div style={{marginTop:6}}><small>Tipo sesión: {c.tipoSesionNombre ?? c.tipoSesion?.Nombre ?? c.tipoSesion?.nombre ?? c.tipoSesionNombre ?? c.tipoSesion?.name ?? '—'}</small></div>
              </div>
              <div>
                <span className="status-pill">{(c.estado || c.estadoCita || 'Pendiente').toString()}</span>
              </div>
            </div>
            <div style={{height:8}} />
            <div className="meta-row">
              <small>Terapeuta: {c.terapeutaNombre || c.terapeuta || '—'}</small>
              <small style={{marginLeft:12}}>Duración: {c.duracionMinutos ?? c.tipoSesion?.duracionMinutos ?? c.DuracionMinutos ?? '—'} min</small>
              <small style={{marginLeft:12}}>Precio: {(c.precio ?? c.tipoSesion?.precio ?? c.Precio) != null ? (c.precio ?? c.tipoSesion?.precio ?? c.Precio) : '—'}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
