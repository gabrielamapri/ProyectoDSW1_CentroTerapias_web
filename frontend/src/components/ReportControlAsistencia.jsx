import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'

export default function ReportControlAsistencia(){
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function load(){
    try{
      setLoading(true); setError(null)
      const q = []
      if(start) q.push(`start=${encodeURIComponent(start)}`)
      if(end) q.push(`end=${encodeURIComponent(end)}`)
      const url = `/api/reportes/control-asistencia${q.length?('?'+q.join('&')):''}`
      const res = await apiFetch(url)
      setItems(res)
    }catch(e){ setError(e?.message||String(e)); setItems(null) }
    finally{ setLoading(false) }
  }

  const list = Array.isArray(items) ? items : (items?.data ?? items?.items ?? items?.asistencias ?? items?.citas ?? null)

  return (
    <section>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2>Control de Asistencia</h2>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input type="date" className="input" value={start} onChange={e=>setStart(e.target.value)} />
          <input type="date" className="input" value={end} onChange={e=>setEnd(e.target.value)} />
          <button className="btn" onClick={load}>Buscar</button>
        </div>
      </div>

      <div style={{marginTop:12}}>
        {loading && <div className="muted">Cargando...</div>}
        {error && <div className="error">Error: {error}</div>}
        {list && Array.isArray(list) && (
          <table className="table pastel">
            <thead><tr><th>Paciente</th><th>Total Citas</th><th>Asistió</th><th>Faltó</th><th>% Asistencia</th></tr></thead>
            <tbody>
              {list.map(r=> (
                <tr key={r.PacienteId || r.id || JSON.stringify(r)}>
                  <td>{r.PacienteNombre ?? r.pacienteNombre ?? '—'}</td>
                  <td>{r.TotalCitas ?? r.total ?? r.totalCitas ?? '—'}</td>
                  <td>{r.Asistio ?? r.asistio ?? '—'}</td>
                  <td>{r.Falto ?? r.falto ?? '—'}</td>
                  <td>{(r.PorcentajeAsistencia ?? r.porcentaje ?? r.percent) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {items && items.TotalCentro && <div style={{marginTop:8}}>Asistencia centro: {items.TotalCentro}</div>}
      </div>
    </section>
  )
}
