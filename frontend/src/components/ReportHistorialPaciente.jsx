import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'

// Single clean implementation to avoid duplicate declarations
export default function ReportHistorialPaciente(){
  const [pacientes, setPacientes] = useState([])
  const [pacienteId, setPacienteId] = useState('')
  const [report, setReport] = useState(null)
  const [terapeutasMap, setTerapeutasMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
   const [tiposMap, setTiposMap] = useState({})

  useEffect(()=>{
    async function load(){
      try{
        const res = await apiFetch('/api/pacientes')
        setPacientes(Array.isArray(res) ? res : (res?.data ?? res ?? []))
      }catch(e){ console.error('ReportHistorialPaciente: failed loading pacientes', e); setPacientes([]) }
    }
    load()
  },[])

  // load terapeutas once to map ids -> names (backend may omit terapeutaNombre in citas)
  useEffect(()=>{
    let cancelled = false
    async function loadTerapeutas(){
      try{
        const res = await apiFetch('/api/terapeutas')
        const list = Array.isArray(res) ? res : (res?.value ?? res?.data ?? res ?? [])
        const map = {}
        list.forEach(t=>{
          const id = t.id ?? t.Id
          if(!id) return
          const key = String(id)
          const name = [t.nombres ?? t.Nombres ?? t.nombre ?? t.Nombre, t.apellidos ?? t.Apellidos ?? ''].filter(Boolean).join(' ').trim()
          const especialidad = t.especialidadNombre ?? t.especialidad ?? t.EspecialidadNombre ?? t.Especialidad ?? ''
          map[key] = { name: name || `${t.nombres||t.Nombres||''} ${t.apellidos||t.Apellidos||''}`.trim(), especialidad: especialidad || '' }
        })
        if(!cancelled) setTerapeutasMap(map)
      }catch(e){ console.log('ReportHistorialPaciente: could not load terapeutas', e) }
    }
    loadTerapeutas()
    return ()=> cancelled = true
  },[])

  // load tipos de sesión to map id -> nombre
  useEffect(()=>{
    let cancelled = false
    async function loadTipos(){
      try{
        const res = await apiFetch('/api/TipoSesiones')
        const list = Array.isArray(res) ? res : (res?.value ?? res?.data ?? res ?? [])
        const map = {}
        list.forEach(t=>{ const id = t.id ?? t.Id; if(!id) return; map[String(id)] = t.nombre ?? t.Nombre ?? t.nombreCompleto ?? t.Nombre })
        if(!cancelled) setTiposMap(map)
      }catch(e){ console.log('ReportHistorialPaciente: could not load tipos de sesión', e) }
    }
    loadTipos()
    return ()=> cancelled = true
  },[])

  useEffect(()=>{
    if(!pacienteId){ setReport(null); return }
    let cancelled = false
    async function load(){
      setLoading(true); setError(null)
      try{
        const url = `/api/reportes/historial-paciente/${encodeURIComponent(pacienteId)}?page=${page}&pageSize=${pageSize}`
        const res = await apiFetch(url)
        // raw report received
        if(cancelled) return

        // normalize citas to fill missing fields
        const rawCitas = Array.isArray(res?.citas) ? res.citas : (res?.data ?? (Array.isArray(res)? res : []))
        const normalized = (rawCitas||[]).map(c=>{
          const tid = c.terapeutaId ?? c.TerapeutaId ?? (c.terapeuta && (c.terapeuta.id ?? c.terapeuta.Id))
          const terapeutaEntry = terapeutasMap[tid] ?? {}
          const terapeutaNombre = c.terapeutaNombre ?? c.TerapeutaNombre ?? terapeutaEntry?.name ?? undefined

          // especialidad may be present on cita or infer from terapeuta
          let especialidad = c.especialidad ?? c.Especialidad ?? c.especialidadNombre ?? c.EspecialidadNombre
          if(!especialidad) especialidad = terapeutaEntry?.especialidad || undefined
          if(!especialidad && c.especialidad && typeof c.especialidad === 'object') especialidad = c.especialidad.nombre ?? c.especialidad.nombreCompleto ?? JSON.stringify(c.especialidad)
          // treat empty strings as missing
          if(typeof especialidad === 'string' && !especialidad.trim()) especialidad = undefined

          // tipo de sesión: prefer explicit name, else map by id
          let tipoSesion = c.tipoSesion ?? c.tipoSesionNombre ?? c.TipoSesion ?? c.TipoSesionNombre
          const tipoId = c.tipoSesionId ?? c.TipoSesionId ?? c.tipoSesion?.id ?? c.TipoSesion?.id
          if(!tipoSesion && tipoId) tipoSesion = tiposMap[String(tipoId)]
          if(!tipoSesion && c.tipoSesion && typeof c.tipoSesion === 'object') tipoSesion = c.tipoSesion.nombre ?? c.tipoSesion.nombreCompleto ?? JSON.stringify(c.tipoSesion)
          if(typeof tipoSesion === 'string' && !tipoSesion.trim()) tipoSesion = undefined

          const notas = c.notas ?? c.Notas ?? c.motivo ?? c.Motivo ?? c.observaciones ?? c.Observaciones ?? ''

          return {
            ...c,
            terapeutaNombre: terapeutaNombre ?? '—',
            especialidad: especialidad ?? '—',
            tipoSesion: tipoSesion ?? '—',
            notas: notas || '—'
          }
        })

        // if some terapeutas still missing, try fetching cita details and terapeutas again
        let newReport = {...res, citas: normalized}
        // detect missing therapist ids and also missing especialidad/tipoSesion
        const missingTherapist = (newReport.citas||[]).filter(c=>!(c.terapeutaNombre && c.terapeutaNombre!=='—') && (c.citaId||c.id||c.CitaId)).map(c=>c.citaId??c.id??c.CitaId)
        const missingFields = (newReport.citas||[]).filter(c=>((!c.especialidad || c.especialidad==='') || (!c.tipoSesion || c.tipoSesion==='')) && (c.citaId||c.id||c.CitaId)).map(c=>c.citaId??c.id??c.CitaId)
        const missing = Array.from(new Set([...(missingTherapist||[]), ...(missingFields||[])]))
        // terapeutasMap state and missing IDs
        if(missing.length){
          try{
            // prepare a local copy of terapeutasMap (use freshly fetched if we need to)
            let currentTerapeutasMap = terapeutasMap || {}
            if(Object.keys(currentTerapeutasMap||{}).length===0){
              const tres = await apiFetch('/api/terapeutas')
              const tlist = Array.isArray(tres) ? tres : (tres?.value ?? tres?.data ?? tres ?? [])
              const map = {}
              tlist.forEach(t=>{ const id = t.id ?? t.Id; if(!id) return; const key = String(id); map[key] = { name: [t.nombres??t.Nombres??t.nombre, t.apellidos??t.Apellidos].filter(Boolean).join(' ').trim(), especialidad: t.especialidadNombre ?? t.especialidad ?? '' } })
              if(!cancelled) setTerapeutasMap(map)
              currentTerapeutasMap = map
            }

            // ensure tiposMap locally too
            let currentTiposMap = tiposMap || {}
            if(Object.keys(currentTiposMap||{}).length===0){
              try{
                const tres2 = await apiFetch('/api/TipoSesiones')
                const tlist2 = Array.isArray(tres2) ? tres2 : (tres2?.value ?? tres2?.data ?? tres2 ?? [])
                const map2 = {}
                tlist2.forEach(t=>{ const id = t.id ?? t.Id; if(!id) return; map2[String(id)] = t.nombre ?? t.Nombre ?? t.nombreCompleto ?? t.Nombre })
                if(!cancelled) setTiposMap(map2)
                currentTiposMap = map2
              }catch(e){ /* ignore */ }
            }

            const fetched = await Promise.all(missing.map(id=> apiFetch(`/api/Citas/${id}`)))
            const byId = {}
            fetched.forEach(f=>{
              const cid = f.id ?? f.Id
              const tid = f.terapeutaId ?? f.TerapeutaId ?? (f.terapeuta && (f.terapeuta.id ?? f.terapeuta.Id))
              const tname = f.terapeutaNombre ?? f.TerapeutaNombre ?? (f.terapeuta && ((f.terapeuta.nombres || f.terapeuta.nombre || '') + ' ' + (f.terapeuta.apellidos || f.terapeuta.apellido || '')) )
              // try to capture especialidad and tipoSesion from cita detail and normalize to strings
              let especialidadFromCita = f.especialidad ?? f.Especialidad ?? f.especialidadNombre ?? f.EspecialidadNombre ?? (f.especialidad && (f.especialidad.nombre || f.especialidad.nombreCompleto))
              if(especialidadFromCita && typeof especialidadFromCita === 'object') especialidadFromCita = especialidadFromCita.nombre ?? especialidadFromCita.especialidadNombre ?? JSON.stringify(especialidadFromCita)
              let tipoFromCita = f.tipoSesion ?? f.tipoSesionNombre ?? f.TipoSesion ?? f.TipoSesionNombre ?? (f.tipoSesion && (f.tipoSesion.nombre || f.tipoSesion.descripcion))
              if(tipoFromCita && typeof tipoFromCita === 'object') tipoFromCita = tipoFromCita.nombre ?? tipoFromCita.descripcion ?? JSON.stringify(tipoFromCita)
              byId[cid] = { tid, tname: (tname||'').trim(), especialidad: especialidadFromCita, tipoSesion: tipoFromCita }
            })

            newReport = {...newReport, citas: (newReport.citas||[]).map(c=>{
              const cid = c.citaId ?? c.id ?? c.CitaId
              if(!cid) return c
              const info = byId[cid]
              const tidKey = info?.tid ? String(info.tid) : undefined
              const mapEntry = tidKey ? currentTerapeutasMap[tidKey] : undefined
                  const mapName = mapEntry ? (typeof mapEntry === 'object' ? mapEntry.name : mapEntry) : undefined
                  const terapeutaName = info?.tname || mapName || c.terapeutaNombre || c.TerapeutaNombre || '—'
                  let especial = c.especialidad ?? c.Especialidad ?? c.especialidadNombre ?? c.EspecialidadNombre ?? info?.especialidad ?? (mapEntry && mapEntry.especialidad) ?? undefined
                  if(typeof especial === 'string' && !especial.trim()) especial = undefined
                  let tipoFromInfo = info?.tipoSesion
                  if(typeof tipoFromInfo === 'string' && !tipoFromInfo.trim()) tipoFromInfo = undefined
                  // try currentTiposMap with tipo id if available
                  const tipoId = c.tipoSesionId ?? c.TipoSesionId ?? (c.tipoSesion && c.tipoSesion.id) ?? (c.TipoSesion && c.TipoSesion.id) ?? info?.tipoSesionId ?? info?.TipoSesionId
                  const tipo = c.tipoSesion ?? c.tipoSesionNombre ?? c.TipoSesion ?? c.TipoSesionNombre ?? tipoFromInfo ?? (tipoId ? currentTiposMap[String(tipoId)] : undefined) ?? undefined
                  return {...c, terapeutaNombre: terapeutaName, especialidad: especial ?? '—', tipoSesion: tipo ?? '—'}
            })}
              // filled missing terapeutas/especialidad/tipo
          }catch(e){ console.log('ReportHistorialPaciente: error filling missing terapeutas', e) }
        }

        if(cancelled) return
        try{
          ;(newReport.citas||[]).forEach(c=>{
            const cid = c.citaId ?? c.id ?? c.CitaId
            const tid = c.terapeutaId ?? c.TerapeutaId ?? (c.terapeuta && (c.terapeuta.id ?? c.terapeuta.Id))
            const tipoId = c.tipoSesionId ?? c.TipoSesionId ?? (c.tipoSesion && c.tipoSesion.id) ?? (c.TipoSesion && c.TipoSesion.id)
            // per-cita diagnostics removed
          })
        }catch(e){ /* diagnostics error ignored */ }
        setReport(newReport)
      }catch(e){ console.error('ReportHistorialPaciente: failed loading report', e); if(!cancelled) setError(e?.message||String(e)); if(!cancelled) setReport(null) }
      finally{ if(!cancelled) setLoading(false) }
    }
    load()
    return ()=> cancelled = true
  },[pacienteId,page,pageSize])

  const list = report?.citas ?? report?.data ?? (Array.isArray(report)? report : null)

  const formatDate = (iso) => {
    if(!iso) return '—'
    const d = new Date(iso)
    if(Number.isNaN(d.getTime())) return '—'
    const dd = String(d.getDate()).padStart(2,'0')
    const mm = String(d.getMonth()+1).padStart(2,'0')
    const yyyy = d.getFullYear()
    const hh = String(d.getHours()).padStart(2,'0')
    const min = String(d.getMinutes()).padStart(2,'0')
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`
  }

  const translateEstado = (s) => {
    if(!s) return '—'
    const t = String(s).toLowerCase()
    if(t.includes('complete') || t.includes('complet')) return 'Completada'
    if(t.includes('cancel') || t.includes('anul')) return 'Anulada'
    if(t.includes('sched') || t.includes('program')) return 'Programada'
    return String(s)
  }

  const renderVal = (v) => {
    if(v === null || v === undefined) return '—'
    if(typeof v === 'object'){
      if(v.name) return String(v.name)
      if(v.especialidad) return String(v.especialidad)
      try{ return JSON.stringify(v) }catch(e){ return String(v) }
    }
    return String(v)
  }

  return (
    <section>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2>Historial Paciente</h2>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select className="input" value={pacienteId} onChange={e=>{ setPacienteId(e.target.value); setPage(1) }}>
            <option value="">Seleccione paciente</option>
            {(pacientes||[]).map(p=> (
              <option key={p.id ?? p.Id} value={p.id ?? p.Id}>{`${(p.nombres||p.Nombres||'').trim()} ${(p.apellidos||p.Apellidos||'').trim()}`}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{marginTop:12}}>
        {report && (
          <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:12}}>
            <div style={{padding:12,background:'#f5f7fa',borderRadius:8,minWidth:220}}>
              <div className="muted">Paciente</div>
              <div style={{fontWeight:600}}>{report.pacienteNombre ?? '—'}</div>
              <div className="muted">DNI: {report.pacienteDNI ?? report.pacienteDni ?? '—'}</div>
              <div className="muted">Edad: {report.edad ?? report.age ?? '—'} años</div>
            </div>
            <div style={{padding:12,background:'#f5f7fa',borderRadius:8,minWidth:260}}>
              <div className="muted">Responsable</div>
              <div style={{fontWeight:600}}>{report.responsableNombre ?? '—'}</div>
              <div className="muted">DNI: {report.responsableDNI ?? '—'}</div>
              <div className="muted">Teléfono: {report.responsableTelefono ?? '—'}</div>
              <div className="muted">Email: {report.responsableEmail ?? '—'}</div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'stretch',flexWrap:'wrap'}}>
              <div style={{padding:12,background:'#f5f7fa',borderRadius:8,minWidth:140,marginRight:8}}>
                <div className="muted">Total citas</div>
                <div style={{fontWeight:600}}>{report.totalCitas ?? report.total ?? '—'}</div>
              </div>
              <div style={{padding:12,background:'#e6ffed',borderRadius:8,minWidth:140,marginRight:8}}>
                <div className="muted">Completadas</div>
                <div style={{fontWeight:600}}>{report.citasCompletadas ?? report.CitasCompletadas ?? 0}</div>
              </div>
              <div style={{padding:12,background:'#fff0f0',borderRadius:8,minWidth:140,marginRight:8}}>
                <div className="muted">Canceladas</div>
                <div style={{fontWeight:600}}>{report.citasCanceladas ?? report.CitasCanceladas ?? 0}</div>
              </div>
              <div style={{padding:12,background:'#e8f0ff',borderRadius:8,minWidth:140}}>
                <div className="muted">Programadas</div>
                <div style={{fontWeight:600}}>{report.citasProgramadas ?? report.CitasProgramadas ?? 0}</div>
              </div>
              <div style={{width:'100%',marginTop:8}} className="muted">Asistencia: { (report.citasCompletadas ?? report.CitasCompletadas ?? 0) > 0 && (report.totalCitas ?? report.total ?? 0) ? Math.round(((report.citasCompletadas ?? report.CitasCompletadas ?? 0)/(report.totalCitas ?? report.total ?? 1))*100) : 0 }%</div>
            </div>
          </div>
        )}

        {loading && <div className="muted">Cargando...</div>}
        {error && <div className="error">Error: {error}</div>}

        {list && Array.isArray(list) && (
          <table className="table pastel">
            <thead>
              <tr>
                <th style={{width:'14%'}}>Fecha</th>
                <th style={{width:90}}>Estado</th>
                <th style={{width:'18%'}}>Terapeuta</th>
                <th style={{width:'12%'}}>Especialidad</th>
                <th style={{width:'22%'}}>Tipo Sesión</th>
                <th style={{width:'30%'}}>Notas</th>
              </tr>
            </thead>
            <tbody>
              {list.map(r=> {
                const key = r.citaId ?? r.id ?? r.CitaId ?? JSON.stringify(r)
                const fecha = r.fecha ?? r.Fecha
                const estado = r.estado ?? r.Estado

                const terapeutaRaw = r.terapeutaNombre ?? r.TerapeutaNombre
                const terapeutasEntry = terapeutasMap && (terapeutasMap[r.terapeutaId ?? r.TerapeutaId])
                const terapeutaVal = terapeutaRaw ?? (terapeutasEntry ? (typeof terapeutasEntry === 'object' ? terapeutasEntry.name : terapeutasEntry) : undefined)

                const especialRaw = r.especialidad ?? r.Especialidad ?? r.especialidadNombre ?? r.EspecialidadNombre
                const especialVal = especialRaw ?? (terapeutasEntry && terapeutasEntry.especialidad) ?? undefined

                const tipoRaw = r.tipoSesion ?? r.tipoSesionNombre ?? r.TipoSesion ?? r.TipoSesionNombre
                const tipoId = r.tipoSesionId ?? r.TipoSesionId ?? (r.tipoSesion && r.tipoSesion.id) ?? (r.TipoSesion && r.TipoSesion.id)
                const tipoVal = tipoRaw ?? (tipoId ? tiposMap[tipoId] : undefined)

                const notasVal = r.notas ?? r.Notas ?? '—'

                return (
                  <tr key={key}>
                    <td style={{width:'14%'}}>{formatDate(fecha)}</td>
                    <td style={{width:90}}><span style={{display:'inline-block',padding:'4px 8px',borderRadius:12,backgroundColor: (translateEstado(estado)==='Completada'?'green':(translateEstado(estado)==='Anulada'?'crimson':(translateEstado(estado)==='Programada'?'#b8860b':''))),color:'#fff',fontWeight:600}}>{translateEstado(estado)}</span></td>
                    <td style={{width:'18%'}}>{renderVal(terapeutaVal)}</td>
                    <td style={{width:'12%'}}>{renderVal(especialVal)}</td>
                    <td style={{width:'22%'}}>{renderVal(tipoVal)}</td>
                    <td style={{width:'30%'}}><div style={{maxWidth:'100%',maxHeight:120,overflow:'auto',whiteSpace:'pre-wrap'}}>{notasVal}</div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {report && report.pagination && (() => {
          const pg = report.pagination
          const total = pg.total ?? pg.totalItems ?? 0
          const current = pg.page ?? pg.current ?? 1
          const totalPages = Math.max(1, Math.ceil((total||0) / pageSize))
          return (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
              <div className="muted">Página {current} de {totalPages}</div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn ghost" disabled={current<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Anterior</button>
                <button className="btn ghost" disabled={current>=totalPages} onClick={()=>setPage(p=>p+1)}>Siguiente</button>
              </div>
            </div>
          )
        })()}
      </div>
    </section>
  )
}

