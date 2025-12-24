import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'

export default function ReportCitasProximas(){
  const [days, setDays] = useState(7)
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function load(){
    try{ setLoading(true); setError(null); const url = `/api/reportes/citas-proximas?days=${encodeURIComponent(days)}`; const res = await apiFetch(url); setItems(res) }
    catch(e){ setError(e?.message||String(e)); setItems(null) }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const list = items?.citas ?? items?.data ?? items?.items ?? (Array.isArray(items)? items : null)

  return (
    <section>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2>Citas Próximas</h2>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input type="number" className="input" value={days} onChange={e=>setDays(Number(e.target.value||7))} style={{width:100}} />
          <button className="btn" onClick={load}>Actualizar</button>
        </div>
      </div>

      <div style={{marginTop:12}}>
        {loading && <div className="muted">Cargando...</div>}
        {error && <div className="error">Error: {error}</div>}
        {list && Array.isArray(list) && (
          <table className="table pastel">
            <thead><tr><th>Fecha</th><th>Paciente</th><th>Terapeuta</th><th>Contacto Familia</th><th>Contacto Terapeuta</th></tr></thead>
            <tbody>
              {list.map(c=> (
                <tr key={c.Id || c.id || JSON.stringify(c)}>
                  <td>{(c.Fecha || c.fecha) ? new Date(c.Fecha || c.fecha).toLocaleString() : '—'}</td>
                  <td>{c.PacienteNombre ?? c.pacienteNombre ?? '—'}</td>
                  <td>{c.TerapeutaNombre ?? c.terapeutaNombre ?? '—'}</td>
                  <td>{c.FamiliaContacto ?? c.familiaContacto ?? (c.FamiliaTelefono || c.familiaTelefono) ?? '—'}</td>
                  <td>{c.TerapeutaTelefono ?? c.terapeutaTelefono ?? c.TerapeutaContacto ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
