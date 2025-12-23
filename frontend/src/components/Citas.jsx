import React, { useEffect, useState, useRef } from 'react'
import { apiFetch } from '../utils/api'
import Modal from './Modal'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

console.debug('[Citas] module loaded (improved)')

export default function Citas() {
  console.debug('[Citas] render start')
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthed] = useState(!!localStorage.getItem('token'))
  const abortRef = useRef(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ PacienteId: '', TerapeutaId: '', TipoSesionId: '', FechaDate: '', FechaTime: '', DuracionMinutos: 45, Motivo: '' })
  const [createError, setCreateError] = useState(null)
  const [pacientesList, setPacientesList] = useState([])
  const [terapeutasList, setTerapeutasList] = useState([])
  const [tiposList, setTiposList] = useState([])
  const [loadingTerapeutasCreate, setLoadingTerapeutasCreate] = useState(false)

  // availability states
  const [availableDates, setAvailableDates] = useState(new Set()) // store yyyy-mm-dd strings (local)
  const [loadingAvailableDates, setLoadingAvailableDates] = useState(false)
  const [availableSlots, setAvailableSlots] = useState([]) // [{inicioIso, finIso}]
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Helpers for local yyyy-mm-dd (avoid timezone shifts)
  function toYmdLocal(d) {
    if (!d) return ''
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d
    const dt = new Date(d)
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  }
  function parseYmdToDateLocal(ymd) {
    if (!ymd) return undefined
    const parts = ymd.split('-').map(Number)
    return new Date(parts[0], parts[1] - 1, parts[2])
  }

  // Format a Date as local ISO without timezone: 'YYYY-MM-DDTHH:MM:SS'
  function formatLocalIso(dt) {
    if (!dt || !(dt instanceof Date)) return null
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const d = String(dt.getDate()).padStart(2, '0')
    const hh = String(dt.getHours()).padStart(2, '0')
    const mm = String(dt.getMinutes()).padStart(2, '0')
    const ss = String(dt.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}`
  }

  function buildIsoFromLocalYmdAndTime(ymd, time) {
    // ymd = 'YYYY-MM-DD', time = 'HH:MM'
    const [y, m, d] = ymd.split('-').map(Number)
    const [hh, mm] = (time || '').split(':').map(Number)
    const dt = new Date(y, m - 1, d, Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0)
    return formatLocalIso(dt) // local ISO without 'Z'
  }

  // Robust ISO parsing: handle strings with/without timezone consistently (treat no-zone as LOCAL)
  function parseIsoSafe(s) {
    if (!s) return null
    if (s instanceof Date) return s
    if (typeof s === 'number') return new Date(s)
    const str = String(s).trim()
    // If contains timezone info (Z or +|-offset) let Date parse it
    if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(str)) {
      const d = new Date(str)
      return isNaN(d.getTime()) ? null : d
    }
    // If ISO-like but without timezone, treat as LOCAL time (preserve the hour the user expects)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(str)) {
      const [datePart, timePart] = str.split('T')
      const [y, mo, da] = datePart.split('-').map(Number)
      const [hh, mm, ss] = (timePart.split(':').map(Number)).concat([0,0,0])
      const d = new Date(y, mo - 1, da, hh || 0, mm || 0, ss || 0)
      return isNaN(d.getTime()) ? null : d
    }
    // Fallback
    const d = new Date(str)
    return isNaN(d.getTime()) ? null : d
  }

  function formatTime(iso) {
    try {
      const d = parseIsoSafe(iso)
      if (!d) return iso
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch { return iso }
  }

  // Normalization function — definitive single source of truth for mapping API results to UI items
  function normalizeCitas(list) {
    const safe = Array.isArray(list) ? list : (list && list.value) ? list.value : []
    return (safe || []).map(c => {
      const fecha = c.fechaInicio ?? c.fecha ?? c.fechaHora ?? c.FechaInicio ?? c.Fecha
      const pacienteNombre =
        c.pacienteNombre ??
        (c.paciente ? ((c.paciente.nombres || c.paciente.Nombre || c.paciente.nombre || '').trim() + ' ' + (c.paciente.apellidos || c.paciente.Apellidos || c.paciente.apellido || '').trim()).trim() : null) ??
        c.paciente?.nombre ??
        c.paciente?.Nombre ??
        c.PacienteNombre ??
        c.Paciente?.Nombre ??
        '—'

      const terapeutaNombre =
        c.terapeutaNombre ??
        c.TerapeutaNombre ??
        (c.terapeuta ? ((c.terapeuta.nombres || c.terapeuta.Nombre || c.terapeuta.nombre || '').trim() + ' ' + (c.terapeuta.apellidos || c.terapeuta.Apellidos || c.terapeuta.apellido || '').trim()).trim() : null) ??
        c.terapeuta?.nombre ??
        c.terapeuta?.Nombre ??
        '—'

      const tipoSesionNombre =
        c.tipoSesionNombre ?? c.TipoSesionNombre ?? c.tipoSesion?.nombre ?? c.tipoSesion?.Name ?? c.tipoSesion?.Nombre ?? '—'

      const duracion =
        c.duracionMinutos ??
        c.duracion ??
        c.DuracionMinutos ??
        c.TipoSesion?.DuracionMinutos ??
        c.tipoSesion?.duracionMinutos ??
        c.tipoSesion?.DuracionMinutos ??
        (c.TipoSesion && c.TipoSesion.duracionMinutos) ??
        45

      const precio =
        (c.precio ?? c.Precio ?? c.tipoSesion?.precio ?? c.tipoSesion?.Precio ?? c.TipoSesion?.Precio) ?? null

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
  }

  useEffect(() => {
    console.debug('[Citas] mount — starting fetch')
    const controller = new AbortController()
    abortRef.current = controller

    const safeParse = async (res) => {
      if (!res) return null
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
        if (typeof apiFetch === 'function') {
          try {
            const r = await apiFetch('/api/citas')
            raw = await safeParse(r)
            console.debug('[Citas] apiFetch result', raw)
          } catch (e) {
            console.warn('[Citas] apiFetch failed:', e)
          }
        }

        if (raw == null) {
          const rel = '/api/citas'
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

        const normalized = normalizeCitas(Array.isArray(raw) ? raw : raw)
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
      setItems(prev => prev.filter(i => i.id !== item.id))

      let resOk = false
      if (typeof apiFetch === 'function') {
        const r = await apiFetch(`/api/citas/${item.id}`, { method: 'DELETE' })
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
      try {
        const res = await (typeof apiFetch === 'function' ? apiFetch('/api/citas') : fetch('/api/citas', { credentials: 'include' }))
        const raw = (res && typeof res.json === 'function') ? await res.json() : res
        const normalized = normalizeCitas(Array.isArray(raw) ? raw : raw)
        setItems(normalized)
      } catch {
      }
    }
  }

  async function handleCreateSubmit() {
    setCreateError(null)
    try {
      const pacienteId = Number(createForm.PacienteId) || null
      if (!pacienteId) return setCreateError('Seleccione un paciente válido')
      const terapeutaId = createForm.TerapeutaId ? Number(createForm.TerapeutaId) : null
      const tipoSesionId = createForm.TipoSesionId ? Number(createForm.TipoSesionId) : null
      if (!createForm.FechaDate || !createForm.FechaTime) return setCreateError('Seleccione fecha y hora')

      // FechaTime could be either a time (HH:MM) or a full ISO (from slot). Handle both.
      let fechaLocalIso
      if (createForm.FechaTime && (createForm.FechaTime.includes('T') || createForm.FechaTime.includes('-'))) {
        const parsed = parseIsoSafe(createForm.FechaTime)
        if (!parsed) return setCreateError('Fecha inválida')
        // convert parsed date to local ISO without timezone so backend stores the same wall-clock hour
        fechaLocalIso = formatLocalIso(parsed)
      } else {
        // build from local date + time to avoid timezone parse issues
        fechaLocalIso = buildIsoFromLocalYmdAndTime(createForm.FechaDate, createForm.FechaTime)
      }

      const payload = {
        PacienteId: pacienteId,
        TerapeutaId: terapeutaId,
        TipoSesionId: tipoSesionId,
        Fecha: fechaLocalIso,
        DuracionMinutos: Number(createForm.DuracionMinutos) || 45,
        Motivo: createForm.Motivo || ''
      }
      await apiFetch('/api/citas', { method: 'POST', body: payload })
      alert('Cita creada correctamente.')
      setShowCreate(false)

      // reload and normalize the list so UI shows duration immediately
      try {
        const r = await apiFetch('/api/citas')
        const raw = Array.isArray(r) ? r : (r && r.value) ? r.value : r
        const normalized = normalizeCitas(raw)
        setItems(normalized)
      } catch (e) {
        // fallback: just refresh page if fetch fails
        try { window.location.reload() } catch {}
      }
    } catch (e) {
      console.error('[Citas] create error', e)
      const msg = e?.message || 'Error de servidor. Intenta más tarde.'
      setCreateError(msg)
    }
  }

  useEffect(()=> {
    let mounted = true
    if(!showCreate) return
    (async()=> {
      try{
        const [ps, tt] = await Promise.all([
          apiFetch('/api/pacientes').catch(()=>[]),
          apiFetch('/api/TipoSesiones').catch(()=>[])
        ])
        if(!mounted) return
        setPacientesList(Array.isArray(ps)?ps: (ps && ps.value)?ps.value: [])
        setTiposList(Array.isArray(tt)?tt: (tt && tt.value)?tt.value: [])
        // intentionally DO NOT load terapeutas here; they will be loaded when user selects TipoSesion
        setTerapeutasList([])
        setAvailableDates(new Set())
        setAvailableSlots([])
      }catch(e){ console.warn('[Citas] load lists failed', e) }
    })()
    return ()=>{ mounted = false }
  },[showCreate])

  async function onTipoSesionChange(e) {
    const tipoId = Number(e.target.value) || null
    setCreateForm(s => ({ ...s, TipoSesionId: tipoId, TerapeutaId: '', FechaDate: '', FechaTime: '' }))
    setAvailableDates(new Set())
    setAvailableSlots([])
    if (!tipoId) { setTerapeutasList([]); return }

    const tipo = (tiposList || []).find(t => Number(t.Id ?? t.id) === tipoId)
    let especialidadId = tipo?.EspecialidadId ?? tipo?.especialidadId ?? tipo?.especialidad?.id

    if (!especialidadId) {
      try {
        const detalle = await apiFetch(`/api/TipoSesiones/${tipoId}`)
        especialidadId = detalle?.EspecialidadId ?? detalle?.especialidadId ?? detalle?.especialidad?.id
      } catch (err) {
        setTerapeutasList([])
        return
      }
    }

    try {
      setLoadingTerapeutasCreate(true)
      const terapeutas = await apiFetch(`/api/terapeutas?especialidadId=${especialidadId}`)
      setTerapeutasList(Array.isArray(terapeutas) ? terapeutas : (terapeutas && terapeutas.value) ? terapeutas.value : [])
    } catch (err) {
      setTerapeutasList([])
    } finally {
      setLoadingTerapeutasCreate(false)
    }
  }

  // When user chooses a therapist in the create form: fetch available dates for next N days
  async function onTerapeutaChange(e) {
    const terapeutaId = e.target.value === '' ? '' : Number(e.target.value)
    setCreateForm(s => ({ ...s, TerapeutaId: terapeutaId, FechaDate: '', FechaTime: '' }))
    setAvailableSlots([])
    setAvailableDates(new Set())
    setCreateError(null)

    if (!terapeutaId) return

    try {
      setLoadingAvailableDates(true)
      const start = new Date()
      const end = new Date()
      end.setDate(start.getDate() + 30) // next 30 days
      const startIso = toYmdLocal(start)
      const endIso = toYmdLocal(end)
      const url = `/api/franjas/${terapeutaId}/available-dates?start=${startIso}&end=${endIso}&duracion=${createForm.DuracionMinutos || 45}`
      const res = await apiFetch(url)
      const arr = Array.isArray(res) ? res : (res && res.value) ? res.value : []
      const set = new Set((arr || []).map(s => {
        if (!s) return ''
        const d = parseIsoSafe(typeof s === 'string' ? s : s.Fecha ?? s.fecha ?? s)
        return d ? toYmdLocal(d) : (typeof s === 'string' ? s.slice(0,10) : '')
      }).filter(Boolean))
      setAvailableDates(set)
    } catch (err) {
      setAvailableDates(new Set())
    } finally {
      setLoadingAvailableDates(false)
    }
  }

  async function handleDaySelect(day) {
    if (!day) return
    const dateVal = toYmdLocal(day)
    setCreateForm(s => ({ ...s, FechaDate: dateVal, FechaTime: '' }))
    setAvailableSlots([])
    setCreateError(null)

    if (availableDates.size > 0 && !availableDates.has(dateVal)) {
      setCreateError('Fecha no disponible para el terapeuta seleccionado. Elige otra fecha.')
      return
    }

    const terapeutaId = createForm.TerapeutaId ? Number(createForm.TerapeutaId) : null
    if (!terapeutaId) return

    try {
      setLoadingSlots(true)
      const url = `/api/franjas/${terapeutaId}/slots?date=${dateVal}&duracion=${createForm.DuracionMinutos || 45}`
      const res = await apiFetch(url)
      const arr = Array.isArray(res) ? res : (res && res.value) ? res.value : []
      const slots = (arr || []).map(s => {
        const rawInicio = s.inicio ?? s.Inicio ?? s.inicioIso ?? s.InicioIso ?? s.fecha ?? s.Fecha ?? s.inicioUtc ?? s.InicioUtc ?? s.inicioHora
        const rawFin = s.fin ?? s.Fin ?? s.finIso ?? s.FinIso ?? null
        const inicioDate = parseIsoSafe(rawInicio)
        const finDate = parseIsoSafe(rawFin)
        return { inicioIso: inicioDate ? formatLocalIso(inicioDate) : null, finIso: finDate ? formatLocalIso(finDate) : null }
      }).filter(s=>s.inicioIso)
      setAvailableSlots(slots)
    } catch (err) {
      setAvailableSlots([]) 
    } finally {
      setLoadingSlots(false)
    }
  }

  async function onDateChange(e) {
    const dateVal = e.target.value // yyyy-mm-dd
    setCreateForm(s => ({ ...s, FechaDate: dateVal, FechaTime: '' }))
    setAvailableSlots([])
    setCreateError(null)

    if (!dateVal) return

    if (availableDates.size > 0 && !availableDates.has(dateVal)) {
      setCreateError('Fecha no disponible para el terapeuta seleccionado. Elige otra fecha.')
      return
    }

    const terapeutaId = createForm.TerapeutaId ? Number(createForm.TerapeutaId) : null
    if (!terapeutaId) return

    try {
      setLoadingSlots(true)
      const url = `/api/franjas/${terapeutaId}/slots?date=${dateVal}&duracion=${createForm.DuracionMinutos || 45}`
      const res = await apiFetch(url)
      const arr = Array.isArray(res) ? res : (res && res.value) ? res.value : []
      const slots = (arr || []).map(s => {
        const rawInicio = s.inicio ?? s.Inicio ?? s.inicioIso ?? s.InicioIso ?? s.fecha ?? s.Fecha ?? s.inicioUtc ?? s.InicioUtc ?? s.inicioHora
        const rawFin = s.fin ?? s.Fin ?? s.finIso ?? s.FinIso ?? null
        const inicioDate = parseIsoSafe(rawInicio)
        const finDate = parseIsoSafe(rawFin)
        return { inicioIso: inicioDate ? formatLocalIso(inicioDate) : null, finIso: finDate ? formatLocalIso(finDate) : null }
      }).filter(s=>s.inicioIso)
      setAvailableSlots(slots)
    } catch (err) {
      setAvailableSlots([]) 
    } finally {
      setLoadingSlots(false)
    }
  }

  function handleView(item) {
    alert('Ver cita: ' + (item.id ?? JSON.stringify(item)))
  }
  function handleEdit(item) {
    alert('Editar cita: ' + (item.id ?? JSON.stringify(item)))
  }

  if (loading) return <div className="card"><div className="spinner" /></div>
  if (error) return <div className="error">Error: {error}</div>
  if (!items || items.length === 0) return <div className="card">No hay citas</div>

  const modifiers = {
    available: (date) => {
      if (!availableDates || availableDates.size === 0) return false
      return availableDates.has(toYmdLocal(date))
    }
  }
  const modifiersClassNames = { available: 'available-day' }
  const disabled = (day) => {
    if (!availableDates || availableDates.size === 0) return false
    return !availableDates.has(toYmdLocal(day))
  }

  return (
    <>
      <style>{`
        /* Pastel availability day */
        .available-day { background:#f0fff4 !important; border-bottom:3px solid #7bd389 !important; color:#0b5d37 !important; }

        /* Card: softer, more spacious, rounded */
        .card { background: linear-gradient(180deg,#fffafc 0%,#f7fff9 100%); border:1px solid rgba(20,20,20,0.04); padding:16px; border-radius:12px; margin-bottom:14px; box-shadow:0 6px 18px rgba(29,33,49,0.04); display:flex; flex-direction:column; gap:10px; }

        .card h3 { margin:0; font-size:1.05rem; color:#222; }
        .cita-title { margin:0 0 14px 0; font-size:1rem; font-weight:600; color:#24303a; line-height:1.2; }
        .patient { display:block; margin-top:12px; margin-bottom:10px; font-weight:600; color:#333; font-size:0.98rem; }
        /* Make spacing between Tipo de Sesión and Terapeuta equal to fecha->Paciente (14px) */
        .session-row { margin-top:0; margin-bottom:14px; }
        .session-type { color:#5f6b6f; font-size:0.92rem; display:block; }

        /* Meta row layout and muted text */
        .meta-row { display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-top:0; }
        .meta-row small { color:#6b6b6b; background:transparent; padding:2px 6px; border-radius:6px; }

        /* Status pill: pastel variant */
        .status-pill { background:#e8f3ff; color:#175f9c; padding:6px 10px; border-radius:999px; display:inline-block; font-size:13px; font-weight:600; border:1px solid rgba(23,95,156,0.12); }

        /* Buttons: pastel, softer hover */
        .btn { background:#ffdce6; color:#5a2130; padding:8px 12px; border-radius:8px; border:none; cursor:pointer; box-shadow:0 1px 0 rgba(0,0,0,0.03); }
        .btn:hover { transform:translateY(-1px); }
        .btn.ghost { background:transparent; border:1px solid rgba(43,43,43,0.06); color:#3b3b3b; }
        .btn.small { padding:6px 8px; font-size:13px; border-radius:6px; }

        /* Inputs and form grid */
        .input { width:100%; padding:10px; border-radius:8px; border:1px solid rgba(0,0,0,0.06); box-sizing:border-box; background:#fff; }
        /* Make form fields stack vertically for clearer layout */
        .form-grid { display:grid; gap:12px; grid-template-columns: 1fr; }
        @media (max-width:800px) { .form-grid { grid-template-columns: 1fr } }

        .muted { color:#7a7a7a; font-size:0.9rem; }
      `}</style>

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
                <div className="form-grid">
                  <select className="input" value={createForm.PacienteId} onChange={e=>setCreateForm(s=>({...s,PacienteId: e.target.value === '' ? '' : Number(e.target.value)}))}>
                    <option value="">Seleccione paciente</option>
                    {(pacientesList||[]).map(p=> (
                      <option key={p.Id ?? p.id} value={p.Id ?? p.id}>{(p.Nombres || p.nombres || p.nombre || '') + ' ' + (p.Apellidos || p.apellidos || '')}</option>
                    ))}
                  </select>

                  <select className="input" value={createForm.TipoSesionId} onChange={onTipoSesionChange}>
                    <option value="">Seleccione tipo de sesión</option>
                    {(tiposList||[]).map(ts=> (
                      <option key={ts.Id ?? ts.id} value={ts.Id ?? ts.id}>{ts.Nombre ?? ts.nombre ?? ts.name}</option>
                    ))}
                  </select>

                  <select
                    className="input"
                    value={createForm.TerapeutaId}
                    onChange={onTerapeutaChange}
                    disabled={!createForm.TipoSesionId || loadingTerapeutasCreate}
                  >
                    <option value="">{createForm.TipoSesionId ? 'Seleccione terapeuta' : 'Seleccione tipo de sesión primero'}</option>
                    {(!loadingTerapeutasCreate && (terapeutasList||[]).length>0) && (terapeutasList||[]).map(t=> (
                      <option key={t.Id ?? t.id} value={t.Id ?? t.id}>{((t.Nombres||t.nombres||t.nombre||'') + ' ' + (t.Apellidos||t.apellidos||'')) || (t.especialidadNombre || t.EspecialidadNombre || t.Especialidad?.Nombre || 'Terapeuta')}</option>
                    ))}
                  </select>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ width: '100%' }}>
                      {loadingAvailableDates ? <small className="muted">Cargando fechas disponibles...</small> : null}
                      {availableDates.size>0 ? <small className="muted">Fechas habilitadas resaltadas en el selector.</small> : null}
                      <DayPicker
                        mode="single"
                        selected={createForm.FechaDate ? parseYmdToDateLocal(createForm.FechaDate) : undefined}
                        onSelect={handleDaySelect}
                        modifiers={modifiers}
                        modifiersClassNames={modifiersClassNames}
                        disabled={disabled}
                        fromDate={new Date()}
                      />
                    </div>

                    <div style={{ width: '100%' }}>
                      {loadingSlots ? <div style={{ padding: 8 }}>Cargando horarios...</div> : null}
                      {!loadingSlots && availableSlots && availableSlots.length>0 ? (
                        <select className="input" value={createForm.FechaTime} onChange={e=>setCreateForm(s=>({...s,FechaTime:e.target.value}))}>
                          <option value="">Seleccione hora</option>
                          {availableSlots.map(s=>(
                            <option key={s.inicioIso} value={s.inicioIso}>{formatTime(s.inicioIso)}{s.finIso ? ' - ' + formatTime(s.finIso) : ''}</option>
                          ))}
                        </select>
                      ) : (
                        <input type="time" className="input" value={createForm.FechaTime} onChange={e=>setCreateForm(s=>({...s,FechaTime:e.target.value}))} disabled={!createForm.FechaDate || loadingSlots} />
                      )}
                    </div>
                  </div>

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
                  <h3 className="cita-title">
                    {c.fecha ? (function(){ const d=parseIsoSafe(c.fecha); return d ? d.toLocaleString() : String(c.fecha) })() : 'Fecha pendiente'}
                  </h3>
                  <small className="patient">Paciente: {c.pacienteNombre}</small>
                  <div className="session-row">
                    <small className="session-type">Tipo de Sesión: {c.tipoSesionNombre}</small>
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

              <div style={{ height: 4 }} />

              <div className="meta-row">
                <small>
                  Terapeuta: {c.terapeutaNombre || c.raw?.TerapeutaNombre || c.raw?.terapeutaNombre || (c.raw?.terapeuta ? ((c.raw.terapeuta.Nombres || c.raw.terapeuta.nombres || '') + ' ' + (c.raw.terapeuta.Apellidos || c.raw.terapeuta.apellidos || '')).trim() : '—')}
                </small>
                <small style={{ marginLeft: 12 }}>Duración: {(c.duracion ?? c.raw?.DuracionMinutos ?? c.raw?.duracionMinutos) ?? '—'} min</small>
                <small style={{ marginLeft: 12 }}>Precio: { (c.precio ?? c.raw?.Precio ?? c.raw?.precio ?? (c.raw?.tipoSesion?.precio)) != null ? (c.precio ?? c.raw?.Precio ?? c.raw?.precio ?? c.raw?.tipoSesion?.precio) : '—'}</small>
              </div>

              {/* Observaciones ocultas en la tarjeta según petición */}
            </div>
          ))}
        </div>
      </section>
    </>
  )
}