import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'

export default function ReportEstadoCuenta(){
  const [familias, setFamilias] = useState([])
  const [familiaId, setFamiliaId] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(()=>{ apiFetch('/api/familias').then(r=>setFamilias(Array.isArray(r)?r:[])).catch(()=>setFamilias([])) },[])

  async function load(){
    if(!familiaId) return setReport(null)
    try{ setLoading(true); setError(null); const url = `/api/reportes/estado-cuenta?familiaId=${encodeURIComponent(familiaId)}`; const res = await apiFetch(url); setReport(res) }
    catch(e){ setError(e?.message||String(e)); setReport(null) }
    finally{ setLoading(false) }
  }

  return (
    <section>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2>Estado de Cuenta (Familia)</h2>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select className="input" value={familiaId} onChange={e=>setFamiliaId(e.target.value)}>
            <option value="">Seleccione familia</option>
            {(familias||[]).map(f=> <option key={f.Id ?? f.id} value={f.Id ?? f.id}>{(f.ResponsablePrincipalNombre ?? f.responsablePrincipalNombre) || (f.ResponsableNombre ?? f.nombre) || `Familia ${f.Id ?? f.id}`}</option>)}
          </select>
          <button className="btn" onClick={load}>Cargar</button>
        </div>
      </div>

      <div style={{marginTop:12}}>
        {loading && <div className="muted">Cargando...</div>}
        {error && <div className="error">Error: {error}</div>}
        {report && (
          <div>
            <table className="table pastel">
              <thead><tr><th>Hijo</th><th>Sesiones</th><th>Costo total</th><th>Debe</th></tr></thead>
              <tbody>
                {(report.hijos || report.children || report).map(h=> (
                  <tr key={h.PacienteId || h.id || JSON.stringify(h)}>
                    <td>{h.PacienteNombre ?? h.pacienteNombre ?? '—'}</td>
                    <td>{h.Sesiones ?? h.sessions ?? '—'}</td>
                    <td>{h.CostoTotal ?? h.total ?? '—'}</td>
                    <td>{h.Deuda ?? h.debt ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{marginTop:8}}><strong>Deuda total familia: </strong>{report.totalDeuda ?? report.total ?? '—'}</div>
          </div>
        )}
      </div>
    </section>
  )
}
