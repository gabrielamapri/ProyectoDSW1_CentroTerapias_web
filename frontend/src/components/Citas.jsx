import React, { useEffect, useState, useRef } from 'react'
import { apiFetch } from '../utils/api' // si no existe, usamos fallback

console.debug('[Citas] module loaded (improved)')

export default function Citas() {
  console.debug('[Citas] render start')
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthed, setIsAuthed] = useState(!!localStorage.getItem('token'))
  const abortRef = useRef(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ PacienteId: '', TerapeutaId: '', TipoSesionId: '', FechaDate: '', FechaTime: '', DuracionMinutos: 60, Motivo: '' })
  const [createError, setCreateError] = useState(null)
  const [pacientesList, setPacientesList] = useState([])
  const [terapeutasList, setTerapeutasList] = useState([])
  const [tiposList, setTiposList] = useState([])

  useEffect(() => {
    console.debug('[Citas] mount — starting fetch')
    const controller = new AbortController()
    abortRef.current = controller

    const safeParse = async (res) => {
      if (!res) return null
      // If it's already parsed JSON
      if (typeof res === 'object' && !('json' in res)) return res
      try {
        return await res.json()
      } catch {
        return null
      }
    }

    const fetchCitas = async () => {
      setLoading(true)
      setError(null)
      try {
        let raw = null
        // Prefer apiFetch when available
        if (typeof apiFetch === 'function') {
          try {
            const r = await apiFetch('/api/citas', { signal: controller.signal })
            raw = await safeParse(r)
            console.debug('[Citas] apiFetch result', raw)
          } catch (e) {
            console.warn('[Citas] apiFetch failed:', e)
          }
        }

        // Fallback to relative URL (Vite proxy) then to absolute
        if (raw == null) {
          const rel = '/api/citas'
          const abs = 'http://localhost:5291/api/citas'
          const url = rel
          console.debug('[Citas] fallback fetch ->', url)
          const res = await fetch(url, { credentials: 'include', signal: controller.signal })
          if (res.status === 401) {
            setError('Autenticación requerida (401)')
            setLoading(false)
            return
          }
          if (!res.ok) throw new Error('HTTP ' + res.status)
          raw = await safeParse(res)
          console.debug('[Citas] fetch json', raw)
        }

        const list = Array.isArray(raw) ? raw : (raw && raw.value) ? raw.value : []
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
      } catch (e) {
        if (e.name === 'AbortError') {
          console.debug('[Citas] fetch aborted')
          return
        }
        console.error('[Citas] error', e)
        setError(e.message || String(e))
      } finally {
        setLoading(false)
      }
    }

    fetchCitas()

    return () => {
      console.debug('[Citas] unmount — aborting fetch')
      controller.abort()
    }
  }, [])

  async function handleCancel(item) {
    if (!confirm('Cancelar cita?')) return
    try {
      // optimistic UI: remove locally first
      setItems(prev => prev.filter(i => i.id !== item.id))

      let resOk = false
      if (typeof apiFetch === 'function') {
        const r = await apiFetch(`/api/citas/${item.id}`, { method: 'DELETE' })
        // apiFetch might return parsed JSON or Response — try to infer success
        if (r && r.ok === false) {
          throw new Error('Error al cancelar (apiFetch)')
        }
        resOk = true
      } else {
        const url = `/api/citas/${item.id}`
        const res = await fetch(url, { method: 'DELETE', credentials: 'include' })
        if (res.status === 401) throw new Error('No autorizado (401)')
        if (!res.ok) throw new Error('HTTP ' + res.status)
        resOk = true
      }

      if (!resOk) throw new Error('No se pudo cancelar')
    } catch (e) {
      alert('Error al cancelar: ' + (e.message || String(e)))
      // rollback: refetch list (simple approach)
      try {
        // quick refetch
        const res = await (typeof apiFetch === 'function' ? apiFetch('/api/citas') : fetch('/api/citas', { credentials: 'include' }))
        const raw = (res && typeof res.json === 'function') ? await res.json() : res
        const list = Array.isArray(raw) ? raw : (raw && raw.value) ? raw.value : []
        setItems(list.map(x => x)) // shallow reset, normalization will happen on next mount but keep simple
      } catch {
        // ignore
      }
    }
  }

  async function handleCreateSubmit() {
    setCreateError(null)
    try {
      // basic validation
      const pacienteId = Number(createForm.PacienteId) || null
      if (!pacienteId) return setCreateError('Seleccione un paciente válido')
      const terapeutaId = createForm.TerapeutaId ? Number(createForm.TerapeutaId) : null
      const tipoSesionId = createForm.TipoSesionId ? Number(createForm.TipoSesionId) : null
      if (!createForm.FechaDate || !createForm.FechaTime) return setCreateError('Seleccione fecha y hora')
      const fechaIso = new Date(`${createForm.FechaDate}T${createForm.FechaTime}`).toISOString()
      const payload = {
        PacienteId: pacienteId,
        TerapeutaId: terapeutaId,
        TipoSesionId: tipoSesionId,
        Fecha: fechaIso,
        DuracionMinutos: Number(createForm.DuracionMinutos) || 60,
        Motivo: createForm.Motivo || ''
      }
      const res = await apiFetch('/api/citas', { method: 'POST', body: payload })
      // success
      alert('Cita creada correctamente.')
      setShowCreate(false)
      // refresh list
      try { const r = await apiFetch('/api/citas'); const list = Array.isArray(r) ? r : (r && r.value) ? r.value : []; setItems(list.map(c=>c)) } catch(e){ /* ignore */ }
    } catch (e) {
      console.error('[Citas] create error', e)
      const msg = e?.message || 'Error de servidor. Intenta más tarde.'
      setCreateError(msg)
    }
  }

  // Load minimal lists when opening create modal
  useEffect(()=>{
    let mounted = true
    if(!showCreate) return
    (async()=>{
      try{
        const [ps, ts, tt] = await Promise.all([
          apiFetch('/api/pacientes').catch(()=>[]),
          apiFetch('/api/terapeutas').catch(()=>[]),
          apiFetch('/api/tipos-sesiones').catch(()=>[])
        ])
        if(!mounted) return
        setPacientesList(Array.isArray(ps)?ps: (ps && ps.value)?ps.value: [])
        setTerapeutasList(Array.isArray(ts)?ts: (ts && ts.value)?ts.value: [])
        setTiposList(Array.isArray(tt)?tt: (tt && tt.value)?tt.value: [])
      }catch(e){ console.warn('[Citas] load lists failed', e) }
    })()
    return ()=>{ mounted = false }
  },[showCreate])

  function handleView(item) {
    alert('Ver cita: ' + (item.id ?? JSON.stringify(item)))
  }
  function handleEdit(item) {
    alert('Editar cita: ' + (item.id ?? JSON.stringify(item)))
  }

  if (loading) return <div className="card"><div className="spinner" /></div>
  if (error) return <div className="error">Error: {error}</div>
  if (!items || items.length === 0) return <div className="card">No hay citas</div>

  return (
    <section>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2>Citas</h2>
        <div>
          <button className="btn" onClick={()=>setShowCreate(true)}>Nueva Cita</button>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        {showCreate && (
          <Modal title="Nueva Cita" onClose={()=>{ setShowCreate(false); setCreateError(null) }}>
            <form onSubmit={e=>{ e.preventDefault(); handleCreateSubmit() }}>
              <div style={{display:'grid',gap:8}}>
                <select className="input" value={createForm.PacienteId} onChange={e=>setCreateForm(s=>({...s,PacienteId: e.target.value === '' ? '' : Number(e.target.value)}))}>
                  <option value="">Seleccione paciente</option>
                  {(pacientesList||[]).map(p=> (
                    <option key={p.Id ?? p.id} value={p.Id ?? p.id}>{(p.Nombres || p.nombres || p.nombre || '') + ' ' + (p.Apellidos || p.apellidos || '')}</option>
                  ))}
                </select>
                <select className="input" value={createForm.TerapeutaId} onChange={e=>setCreateForm(s=>({...s,TerapeutaId: e.target.value === '' ? '' : Number(e.target.value)}))}>
                  <option value="">Seleccione terapeuta (opcional)</option>
                  {(terapeutasList||[]).map(t=> (
                    <option key={t.Id ?? t.id} value={t.Id ?? t.id}>{((t.Nombres||t.nombres||t.nombre||'') + ' ' + (t.Apellidos||t.apellidos||'')) || (t.especialidadNombre || t.EspecialidadNombre || t.Especialidad?.Nombre || 'Terapeuta')}</option>
                  ))}
                </select>
                <select className="input" value={createForm.TipoSesionId} onChange={e=>setCreateForm(s=>({...s,TipoSesionId: e.target.value === '' ? '' : Number(e.target.value)}))}>
                  <option value="">Seleccione tipo de sesión (opcional)</option>
                  {(tiposList||[]).map(ts=> (
                    <option key={ts.Id ?? ts.id} value={ts.Id ?? ts.id}>{ts.Nombre ?? ts.nombre ?? ts.name}</option>
                  ))}
                </select>
                <input type="date" className="input" value={createForm.FechaDate} onChange={e=>setCreateForm(s=>({...s,FechaDate:e.target.value}))} />
                <input type="time" className="input" value={createForm.FechaTime} onChange={e=>setCreateForm(s=>({...s,FechaTime:e.target.value}))} />
                <input type="number" className="input" value={createForm.DuracionMinutos} onChange={e=>setCreateForm(s=>({...s,DuracionMinutos:Number(e.target.value)}))} />
                <input className="input" placeholder="Motivo" value={createForm.Motivo} onChange={e=>setCreateForm(s=>({...s,Motivo:e.target.value}))} />
                {createError && <div className="error">{createError}</div>}
                <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                  <button className="btn" type="submit">Crear</button>
                  <button type="button" className="btn ghost" onClick={()=>{ setShowCreate(false); setCreateError(null) }}>Cancelar</button>
                </div>
              </div>
            </form>
          </Modal>
        )}
        {items.map((c) => (
          <div className="card" key={c.id ?? JSON.stringify(c)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>
                  {c.fecha ? new Date(c.fecha).toLocaleString() : 'Fecha pendiente'}
                </h3>
                <small className="muted">Paciente: {c.pacienteNombre}</small>
                <div style={{ marginTop: 6 }}>
                  <small>Tipo sesión: {c.tipoSesionNombre}</small>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div>
                  <span className="status-pill">{String(c.estado)}</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <button className="btn small" onClick={() => handleView(c)}>Ver</button>
                  <button className="btn small" onClick={() => handleEdit(c)} style={{ marginLeft: 6 }}>Editar</button>
                  <button
                    className="btn small ghost"
                    onClick={() => handleCancel(c)}
                    style={{ marginLeft: 6 }}
                    disabled={!isAuthed}
                    title={!isAuthed ? 'Debe iniciar sesión para cancelar' : ''}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>

            <div style={{ height: 8 }} />

            <div className="meta-row">
              <small>Terapeuta: {c.terapeutaNombre}</small>
              <small style={{ marginLeft: 12 }}>Duración: {c.duracion} min</small>
              <small style={{ marginLeft: 12 }}>Precio: {c.precio != null ? c.precio : '—'}</small>
            </div>

            {c.observaciones ? (
              <div style={{ marginTop: 8 }}>
                <small>Observaciones: {c.observaciones}</small>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
