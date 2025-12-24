import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'

export default function ReportProgresoNino(){
  const [pacientes, setPacientes] = useState([])
  const [pacienteId, setPacienteId] = useState('')
  const [month, setMonth] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(()=>{ apiFetch('/api/pacientes').then(r=>setPacientes(Array.isArray(r)?r:[])).catch(()=>setPacientes([])) },[])

  async function load(){
    if(!pacienteId || !month) return setReport(null)
    try{ setLoading(true); setError(null); const url = `/api/reportes/progreso?ninoId=${encodeURIComponent(pacienteId)}&month=${encodeURIComponent(month)}`; const res = await apiFetch(url); setReport(res) }
    catch(e){ setError(e?.message||String(e)); setReport(null) }
    finally{ setLoading(false) }
  }

  return (
    <section>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2>Progreso del Niño</h2>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select className="input" value={pacienteId} onChange={e=>setPacienteId(e.target.value)}>
            <option value="">Seleccione paciente</option>
            {(pacientes||[]).map(p=> <option key={p.Id ?? p.id} value={p.Id ?? p.id}>{(p.Nombres||p.nombres||'') + ' ' + (p.Apellidos||p.apellidos||'')}</option>)}
          </select>
          <input type="month" className="input" value={month} onChange={e=>setMonth(e.target.value)} />
          <button className="btn" onClick={load}>Mostrar</button>
        </div>
      </div>

      <div style={{marginTop:12}}>
        {loading && <div className="muted">Cargando...</div>}
        {error && <div className="error">Error: {error}</div>}
        {report && (
          <div>
            <div><strong>Sesiones este mes:</strong> {report.sesiones ?? report.count ?? '—'}</div>
            <div style={{marginTop:8}}>
              <strong>Áreas:</strong>
              <ul>
                {(report.areas || report.areasTrabajo || []).map(a=> <li key={a}>{a}</li>)}
              </ul>
            </div>
            <div style={{marginTop:8}}><strong>Tareas para casa:</strong><div style={{whiteSpace:'pre-wrap'}}>{report.tareas ?? report.tasks ?? '—'}</div></div>
            <div style={{marginTop:8}}><strong>Recomendaciones:</strong><div style={{whiteSpace:'pre-wrap'}}>{report.recomendaciones ?? report.recommendations ?? '—'}</div></div>
          </div>
        )}
      </div>
    </section>
  )
}
