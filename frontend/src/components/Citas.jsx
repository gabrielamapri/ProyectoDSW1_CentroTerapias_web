  // ...existing code...
import React, { useEffect, useState, useRef } from 'react'
import { apiFetch } from '../utils/api'
import Modal from './Modal'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

console.debug('[Citas] module loaded (improved)')

// --- INICIO: función para obtener el rol del usuario ---
function getUserRole() {
  const role = localStorage.getItem('userRole');
  if (role) return role;
  try {
    const token = localStorage.getItem('ct_token') || localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    const roleUrl = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
    const roleUrlAlt = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role";
    return payload?.role || payload?.Role || payload?.[roleUrl] || payload?.[roleUrlAlt] || null;
  } catch {
    return null;
  }
}
// --- FIN función para obtener el rol del usuario ---


export default function Citas() {
  console.debug('[Citas] render start')
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isAuthed] = useState(!!localStorage.getItem('token'))

  const abortRef = useRef(null)
  const debounceRef = useRef(null)
  const mountedRef = useRef(true)

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ PacienteId: '', TerapeutaId: '', TipoSesionId: '', FechaDate: '', FechaTime: '', DuracionMinutos: 45, Motivo: '' })
  const [createError, setCreateError] = useState(null)
  const [pacientesList, setPacientesList] = useState([])
  const [terapeutasList, setTerapeutasList] = useState([])
  const [tiposList, setTiposList] = useState([])
  const [loadingTerapeutasCreate, setLoadingTerapeutasCreate] = useState(false)
  const [search, setSearch] = useState('')

  // Reprogram state
  const [showReprogram, setShowReprogram] = useState(false)
  const [reprogramForm, setReprogramForm] = useState({ FechaDate: '', FechaTime: '', DuracionMinutos: null })
  const [reprogramError, setReprogramError] = useState(null)
  const [reprogramLoading, setReprogramLoading] = useState(false)
  const [reprogramItem, setReprogramItem] = useState(null)

  // View modal state (replace simple alert)
  const [showView, setShowView] = useState(false)
  const [viewItem, setViewItem] = useState(null)

  // availability states for create
  const [availableDates, setAvailableDates] = useState(new Set()) // store yyyy-mm-dd strings (local)
  const [loadingAvailableDates, setLoadingAvailableDates] = useState(false)
  const [availableSlots, setAvailableSlots] = useState([]) // [{inicioIso, finIso}]
  const [loadingSlots, setLoadingSlots] = useState(false)

  // availability states for reprogram
  const [reprogramAvailableDates, setReprogramAvailableDates] = useState(new Set())
  const [reprogramLoadingAvailableDates, setReprogramLoadingAvailableDates] = useState(false)
  const [reprogramAvailableSlots, setReprogramAvailableSlots] = useState([])
  const [reprogramLoadingSlots, setReprogramLoadingSlots] = useState(false)

  // ...existing code...

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
    const [y, m, d] = ymd.split('-').map(Number)
    const [hh, mm] = (time || '').split(':').map(Number)
    const dt = new Date(y, m - 1, d, Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0)
    return formatLocalIso(dt)
  }
  function parseIsoSafe(s) {
    if (!s) return null
    if (s instanceof Date) return s
    if (typeof s === 'number') return new Date(s)
    const str = String(s).trim()
    if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(str)) {
      const d = new Date(str)
      return isNaN(d.getTime()) ? null : d
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(str)) {
      const [datePart, timePart] = str.split('T')
      const [y, mo, da] = datePart.split('-').map(Number)
      const [hh, mm, ss] = (timePart.split(':').map(Number)).concat([0,0,0])
      const d = new Date(y, mo - 1, da, hh || 0, mm || 0, ss || 0)
      return isNaN(d.getTime()) ? null : d
    }
    const d = new Date(str)
    return isNaN(d.getTime()) ? null : d
  }
  function extractTimeHHMM(value) {
    if (!value) return ''
    if (/^\d{2}:\d{2}$/.test(value)) return value
    if (value.includes('T') || value.includes('-')) {
      const d = parseIsoSafe(value)
      if (!d) return ''
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    return value
  }
  function formatTime(iso) {
    try {
      const d = parseIsoSafe(iso)
      if (!d) return iso
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch { return iso }
  }
  function canReprogramEstado(estado) {
    if (!estado && estado !== 0) return true
    const s = String(estado).toLowerCase()
    return !(s.includes('cancel') || s.includes('anul'))
  }
  // --- INICIO: función para traducir el estado de la cita ---
  function translateEstado(raw) {
    if (raw === null || raw === undefined) return 'Pendiente';
    const s = String(raw).toLowerCase();
    if (s.includes('sched') || s.includes('program') || s.includes('agend')) return 'Programado';
    if (s.includes('cancel') || s.includes('anul')) return 'Anulado';
    if (s.includes('pend')) return 'Pendiente';
    if (s.includes('done') || s.includes('complete')) return 'Completada';
    const str = String(raw);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  // --- FIN función para traducir el estado de la cita ---
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
      const rawEstado = c.estado ?? c.estadoCita ?? c.Estado ?? 'Pendiente'
      const estado = translateEstado(rawEstado)
      const observaciones = c.observaciones ?? c.descripcion ?? c.Observaciones ?? c.Observacion ?? c.notas ?? ''
      return {
        id: c.id ?? c.Id ?? c.citaId ?? null,
        fecha,
        especialidadNombre: c.especialidadNombre ?? c.EspecialidadNombre ?? c.Especialidad?.Nombre ?? c.EspecialidadNombre ?? '',
        pacienteNombre,
        pacienteFamiliaId: c.paciente?.FamiliaId ?? c.paciente?.familiaId ?? c.Paciente?.FamiliaId ?? c.Paciente?.familiaId ?? c.FamiliaId ?? c.familiaId ?? null,
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

  // Initial load once
  useEffect(() => {
    mountedRef.current = true
    const controller = new AbortController()
    abortRef.current = controller
    const load = async () => {
      try {
        setLoading(true)
        let raw = null
        // Detectar rol para endpoint correcto
        const userRole = getUserRole();
        const isPadre = userRole && userRole.toLowerCase() === 'padre';
        const citasUrl = isPadre ? '/api/citas/mis-citas' : '/api/citas';
        try {
          raw = await apiFetch(citasUrl)
        } catch {}
        if (raw == null) {
          const res = await fetch(citasUrl, { credentials: 'include', signal: controller.signal })
          if (!res.ok) throw new Error('HTTP ' + res.status)
          raw = await res.json().catch(()=>[])
        }
        if (!mountedRef.current) return
        setItems(normalizeCitas(Array.isArray(raw) ? raw : raw))
      } catch (e) {
        if (!mountedRef.current) return
        setError(e.message || String(e))
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }
    load()
    return () => { mountedRef.current = false; controller.abort() }
  }, [])

  // Debounced search – keeps input mounted so focus is not lost
  useEffect(() => {
    if (!mountedRef.current) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const controller = new AbortController()
    abortRef.current = controller
    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true)
        const userRole = getUserRole();
        const isPadre = userRole && userRole.toLowerCase() === 'padre';
        const baseUrl = isPadre ? '/api/citas/mis-citas' : '/api/citas';
        const url = search ? `${baseUrl}?search=${encodeURIComponent(search)}` : baseUrl;
        let raw = null
        try {
          raw = await apiFetch(url)
        } catch {}
        if (raw == null) {
          const res = await fetch(url, { credentials: 'include', signal: controller.signal })
          if (!res.ok) throw new Error('HTTP ' + res.status)
          raw = await res.json().catch(()=>[])
        }
        if (!mountedRef.current) return
        setItems(normalizeCitas(Array.isArray(raw) ? raw : raw))
      } catch (e) {
        if (!mountedRef.current) return
        setError(e.message || String(e))
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }, 250)
    return () => { clearTimeout(debounceRef.current); controller.abort() }
  }, [search])

  async function refresh(){
    const userRole = getUserRole();
    const isPadre = userRole && userRole.toLowerCase() === 'padre';
    const baseUrl = isPadre ? '/api/citas/mis-citas' : '/api/citas';
    const url = search ? `${baseUrl}?search=${encodeURIComponent(search)}` : baseUrl;
    const raw = await apiFetch(url).catch(async () => {
      const res = await fetch(url, { credentials: 'include' })
      return res.ok ? res.json() : []
    })
    setItems(normalizeCitas(Array.isArray(raw) ? raw : raw))
  }

  async function handleCancel(item) {
    if (!confirm('Anular cita?')) return
    try {
      setItems(prev => (prev || []).map(i => i.id === item.id ? { ...i, estado: 'Anulando...' } : i))
      await apiFetch(`/api/citas/${item.id}/cancelar`, { method: 'PATCH' })
      setItems(prev => (prev || []).map(i => i.id === item.id ? { ...i, estado: 'Cancelled' } : i))
    } catch (e) {
      alert('Error al anular: ' + (e.message || String(e)))
      try {
        const r = await apiFetch('/api/citas')
        const normalized = normalizeCitas(Array.isArray(r) ? r : r)
        setItems(normalized)
      } catch {}
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

      let fechaLocalIso
      if (createForm.FechaTime && (createForm.FechaTime.includes('T') || createForm.FechaTime.includes('-'))) {
        const parsed = parseIsoSafe(createForm.FechaTime)
        if (!parsed) return setCreateError('Fecha inválida')
        fechaLocalIso = formatLocalIso(parsed)
      } else {
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
      // Siempre usar POST /api/citas para crear, sin importar el rol
      await apiFetch('/api/citas', { method: 'POST', body: payload })
      alert('Cita creada correctamente.')
      setShowCreate(false)

      // Refrescar usando el endpoint correcto según el rol
      const userRole = getUserRole();
      const isPadre = userRole && userRole.toLowerCase() === 'padre';
      const citasUrl = isPadre ? '/api/citas/mis-citas' : '/api/citas';
      const r = await apiFetch(citasUrl);
      const normalized = normalizeCitas(Array.isArray(r) ? r : r);
      setItems(normalized);
    } catch (e) {
      setCreateError(e?.message || 'Error de servidor. Intenta más tarde.')
    }
  }

  useEffect(()=> {
    let mounted = true
    if(!showCreate) return
    (async()=> {
      try{
        const userRole = getUserRole();
        const isPadre = userRole && userRole.toLowerCase() === 'padre';
        const pacientesUrl = isPadre ? '/api/pacientes/mis-hijos' : '/api/pacientes';
        const [ps, tt] = await Promise.all([
          apiFetch(pacientesUrl).catch(()=>[]),
          apiFetch('/api/TipoSesiones').catch(()=>[])
        ])
        if(!mounted) return
        setPacientesList(Array.isArray(ps)?ps: (ps && ps.value)?ps.value: [])
        setTiposList(Array.isArray(tt)?tt: (tt && tt.value)?tt.value: [])
        setTerapeutasList([])
        setAvailableDates(new Set())
        setAvailableSlots([])
      }catch(e){ console.warn('[Citas] load lists failed', e) }
    })()
    return ()=>{ mounted = false }
  },[showCreate])

  async function onTipoSesionChange(e) {
    // Solo se usa para admin, para padre el handler está inline
    const tipoId = Number(e.target.value);
    setCreateForm(s => ({ ...s, TipoSesionId: tipoId, TerapeutaId: '', FechaDate: '', FechaTime: '' }));
    setAvailableDates(new Set());
    setAvailableSlots([]);
    if ((!tipoId && tipoId !== 0)) { setTerapeutasList([]); return; }

    // Para admin: buscar por id, para padre: usar índice
    let tipo;
    if (Array.isArray(tiposList) && tiposList.length > 0 && tiposList[0].Id === undefined && tiposList[0].id === undefined) {
      // Para padre: tipoId es el índice
      tipo = tiposList[tipoId];
    } else {
      tipo = (tiposList || []).find(t => Number(t.Id ?? t.id) === tipoId);
    }
    let especialidadId = tipo?.EspecialidadId ?? tipo?.especialidadId ?? tipo?.especialidad?.id;
    if (!especialidadId) {
      try {
        const detalle = await apiFetch(`/api/TipoSesiones/${tipoId}`);
        especialidadId = detalle?.EspecialidadId ?? detalle?.especialidadId ?? detalle?.especialidad?.id;
      } catch {
        setTerapeutasList([]);
        return;
      }
    }
    try {
      setLoadingTerapeutasCreate(true);
      const terapeutas = await apiFetch(`/api/terapeutas?especialidadId=${especialidadId}`);
      setTerapeutasList(Array.isArray(terapeutas) ? terapeutas : (terapeutas && terapeutas.value) ? terapeutas.value : []);
    } catch {
      setTerapeutasList([]);
    } finally {
      setLoadingTerapeutasCreate(false);
    }
  }

  async function onTerapeutaChange(e) {
    const terapeutaId = e.target.value === '' ? '' : Number(e.target.value)
    setCreateForm(s => ({ ...s, TerapeutaId: terapeutaId, FechaDate: '', FechaTime: '' }))
    setAvailableSlots([])
    setAvailableDates(new Set())
    setCreateError(null)
    if (!terapeutaId) return

    try {
      setLoadingAvailableDates(true);
      const start = new Date();
      const end = new Date(start.getFullYear() + 1, 11, 31); // hasta fin de 2026
      const startIso = toYmdLocal(start);
      const endIso = toYmdLocal(end);
      const url = `/api/franjas/${terapeutaId}/available-dates?start=${startIso}&end=${endIso}&duracion=${createForm.DuracionMinutos || 45}`;
      const res = await apiFetch(url);
      const arr = Array.isArray(res) ? res : (res && res.value) ? res.value : [];
      const set = new Set((arr || []).map(s => {
        if (!s) return '';
        const d = parseIsoSafe(typeof s === 'string' ? s : s.Fecha ?? s.fecha ?? s);
        return d ? toYmdLocal(d) : (typeof s === 'string' ? s.slice(0,10) : '');
      }).filter(Boolean));
      setAvailableDates(set);
    } catch {
      setAvailableDates(new Set());
    } finally {
      setLoadingAvailableDates(false);
    }
  }

  async function handleDaySelect(day) {
    if (!day) return;
    const dateVal = toYmdLocal(day);
    setCreateForm(s => ({ ...s, FechaDate: dateVal, FechaTime: '' }));
    setAvailableSlots([]);
    setCreateError(null);
    if (availableDates.size > 0 && !availableDates.has(dateVal)) {
      setCreateError('Fecha no disponible para el terapeuta seleccionado. Elige otra fecha.');
      return;
    }
    const terapeutaId = createForm.TerapeutaId ? Number(createForm.TerapeutaId) : null;
    if (!terapeutaId) return;

    try {
      setLoadingSlots(true);
      const url = `/api/franjas/${terapeutaId}/slots?date=${dateVal}&duracion=${createForm.DuracionMinutos || 45}`;
      const res = await apiFetch(url);
      const arr = Array.isArray(res) ? res : (res && res.value) ? res.value : [];
      let slots = (arr || []).map(s => {
        const rawInicio = s.inicio ?? s.Inicio ?? s.inicioIso ?? s.InicioIso ?? s.fecha ?? s.Fecha ?? s.inicioUtc ?? s.InicioUtc ?? s.inicioHora;
        const rawFin = s.fin ?? s.Fin ?? s.finIso ?? s.FinIso ?? null;
        const inicioDate = parseIsoSafe(rawInicio);
        const finDate = parseIsoSafe(rawFin);
        return { inicioIso: inicioDate ? formatLocalIso(inicioDate) : null, finIso: finDate ? formatLocalIso(finDate) : null };
      }).filter(s=>s.inicioIso);

      // Si la fecha seleccionada es hoy, filtrar solo los horarios futuros
      const now = new Date();
      const todayYmd = toYmdLocal(now);
      if (dateVal === todayYmd) {
        slots = slots.filter(slot => {
          const slotDate = parseIsoSafe(slot.inicioIso);
          return slotDate && slotDate > now;
        });
      }
      setAvailableSlots(slots);
    } catch {
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function onDateChange(e) {
    const dateVal = e.target.value
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
    } catch {
      setAvailableSlots([]) 
    } finally {
      setLoadingSlots(false)
    }
  }

  async function fetchReprogramAvailableDates(terapeutaId, duracion) {
    if (!terapeutaId) { setReprogramAvailableDates(new Set()); return }
    try {
      setReprogramLoadingAvailableDates(true)
      const start = new Date();
      const end = new Date(start.getFullYear() + 1, 11, 31); // hasta fin de 2026
      const startIso = toYmdLocal(start);
      const endIso = toYmdLocal(end);
      const url = `/api/franjas/${terapeutaId}/available-dates?start=${startIso}&end=${endIso}&duracion=${duracion || 45}`;
      const res = await apiFetch(url);
      const arr = Array.isArray(res) ? res : (res && res.value) ? res.value : [];
      const set = new Set((arr || []).map(s => {
        if (!s) return '';
        const d = parseIsoSafe(typeof s === 'string' ? s : s.Fecha ?? s.fecha ?? s);
        return d ? toYmdLocal(d) : (typeof s === 'string' ? s.slice(0,10) : '');
      }).filter(Boolean));
      setReprogramAvailableDates(set);
    } catch {
      setReprogramAvailableDates(new Set());
    } finally {
      setReprogramLoadingAvailableDates(false);
    }
  }
  async function fetchReprogramSlots(terapeutaId, dateVal, duracion) {
    if (!terapeutaId || !dateVal) { setReprogramAvailableSlots([]); return }
    try {
      setReprogramLoadingSlots(true)
      const url = `/api/franjas/${terapeutaId}/slots?date=${dateVal}&duracion=${duracion || 45}`
      const res = await apiFetch(url)
      const arr = Array.isArray(res) ? res : (res && res.value) ? res.value : []
      const slots = (arr || []).map(s => {
        const rawInicio = s.inicio ?? s.Inicio ?? s.inicioIso ?? s.InicioIso ?? s.fecha ?? s.Fecha ?? s.inicioUtc ?? s.InicioUtc ?? s.inicioHora
        const rawFin = s.fin ?? s.Fin ?? s.finIso ?? s.FinIso ?? null
        const inicioDate = parseIsoSafe(rawInicio)
        const finDate = parseIsoSafe(rawFin)
        return { inicioIso: inicioDate ? formatLocalIso(inicioDate) : null, finIso: finDate ? formatLocalIso(finDate) : null }
      }).filter(s=>s.inicioIso)
      setReprogramAvailableSlots(slots)
    } catch {
      setReprogramAvailableSlots([]) 
    } finally {
      setReprogramLoadingSlots(false)
    }
  }
  function handleReprogramDaySelect(day) {
    if (!day) return
    const dateVal = toYmdLocal(day)
    setReprogramForm(s => ({ ...s, FechaDate: dateVal, FechaTime: '' }))
    setReprogramAvailableSlots([])
    setReprogramError(null)
    if (reprogramAvailableDates.size > 0 && !reprogramAvailableDates.has(dateVal)) {
      setReprogramError('Fecha no disponible para el terapeuta seleccionado. Elige otra fecha.')
      return
    }
    const terapeutaId = reprogramItem?.terapeutaId ?? reprogramItem?.raw?.terapeutaId ?? reprogramItem?.raw?.TerapeutaId ?? reprogramItem?.raw?.terapeuta?.id
    if (!terapeutaId) return
    fetchReprogramSlots(terapeutaId, dateVal, reprogramForm.DuracionMinutos ?? reprogramItem?.duracion ?? reprogramItem?.raw?.DuracionMinutos ?? 45)
  }
  function openReprogramModal(item) {
    const parsed = parseIsoSafe(item.fecha ?? item.raw?.fecha ?? item.raw?.Fecha ?? item.raw?.fechaInicio ?? item.raw?.FechaInicio)
    const ymd = parsed ? toYmdLocal(parsed) : ''
    const hh = parsed ? String(parsed.getHours()).padStart(2,'0') : ''
    const mm = parsed ? String(parsed.getMinutes()).padStart(2,'0') : ''
    const timeVal = parsed ? formatLocalIso(parsed) : (hh && mm ? `${hh}:${mm}` : '')
    setReprogramForm({ FechaDate: ymd, FechaTime: timeVal, DuracionMinutos: item.duracion ?? item.raw?.DuracionMinutos ?? item.duracion ?? null })
    setReprogramItem(item)
    setReprogramError(null)
    setReprogramAvailableSlots([])
    setReprogramAvailableDates(new Set())
    const terapeutaId = item.terapeutaId ?? item.raw?.terapeutaId ?? item.raw?.TerapeutaId ?? item.raw?.terapeuta?.id
    const dur = item.duracion ?? item.raw?.DuracionMinutos ?? reprogramForm.DuracionMinutos ?? 45
    if (terapeutaId) {
      fetchReprogramAvailableDates(terapeutaId, dur).then(() => {
        if (ymd) fetchReprogramSlots(terapeutaId, ymd, dur)
      })
    }
    setShowReprogram(true)
  }
  function handleEdit(item) { openReprogramModal(item) }
  function handleView(item) { setViewItem(item); setShowView(true) }

  async function handleReprogramSubmit(e) {
    e?.preventDefault?.()
    setReprogramError(null)
    if (!reprogramItem) return setReprogramError('Item inválido')
    if (!reprogramForm.FechaDate || !reprogramForm.FechaTime) return setReprogramError('Seleccione fecha y hora')
    setReprogramLoading(true)
    try {
      let fechaLocalIso
      if (reprogramForm.FechaTime && (reprogramForm.FechaTime.includes('T') || reprogramForm.FechaTime.includes('-'))) {
        const parsed = parseIsoSafe(reprogramForm.FechaTime)
        if (!parsed) return setReprogramError('Fecha inválida')
        fechaLocalIso = formatLocalIso(parsed)
      } else {
        fechaLocalIso = buildIsoFromLocalYmdAndTime(reprogramForm.FechaDate, reprogramForm.FechaTime)
      }
      const payload = { Fecha: fechaLocalIso, ...(reprogramForm.DuracionMinutos ? { DuracionMinutos: Number(reprogramForm.DuracionMinutos) } : {} ) }
      let result = await apiFetch(`/api/citas/${reprogramItem.id}/reprogramar`, { method: 'PATCH', body: payload }).catch(async () => {
        const res = await fetch(`/api/citas/${reprogramItem.id}/reprogramar`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json().catch(()=>null)
      })
      const normalized = normalizeCitas(Array.isArray(result) ? result : result ? [result] : [])
      if (normalized.length > 0) {
        const updated = normalized[0]
        setItems(prev => (prev || []).map(i => i.id === updated.id ? updated : i))
      } else {
        const r = await apiFetch('/api/citas')
        setItems(normalizeCitas(Array.isArray(r) ? r : r))
      }
      alert('Cita reprogramada correctamente.')
      setShowReprogram(false)
      setReprogramItem(null)
      setReprogramAvailableDates(new Set())
      setReprogramAvailableSlots([])
    } catch (err) {
      setReprogramError(err?.message || 'Error al reprogramar. Intenta más tarde.')
    } finally {
      setReprogramLoading(false)
    }
  }

  const modifiers = { available: (date) => (availableDates?.size || 0) > 0 && availableDates.has(toYmdLocal(date)) }
  const modifiersClassNames = { available: 'available-day' }
  const disabled = (day) => (availableDates?.size || 0) > 0 && !availableDates.has(toYmdLocal(day))
  const reprogramModifiers = { available: (date) => (reprogramAvailableDates?.size || 0) > 0 && reprogramAvailableDates.has(toYmdLocal(date)) }
  const reprogramDisabled = (day) => (reprogramAvailableDates?.size || 0) > 0 && !reprogramAvailableDates.has(toYmdLocal(day))

  // Ordenar items por fecha descendente (más reciente primero)
  const sortedItems = Array.isArray(items)
    ? [...items].sort((a, b) => {
        const da = a.fecha ? new Date(a.fecha) : new Date(0);
        const db = b.fecha ? new Date(b.fecha) : new Date(0);
        return db - da;
      })
    : items;

  return (
    <>
      <style>{`
        .available-day { background:#f0fff4 !important; border-bottom:3px solid #7bd389 !important; color:#0b5d37 !important; }
        .card { background: linear-gradient(180deg,#fffafc 0%,#f7fff9 100%); border:1px solid rgba(20,20,20,0.04); padding:16px; border-radius:12px; margin-bottom:14px; box-shadow:0 6px 18px rgba(29,33,49,0.04); display:flex; flex-direction:column; gap:10px; }
        .card h3 { margin:0; font-size:1.05rem; color:#222; }
        .cita-title { margin:0 0 14px 0; font-size:1rem; font-weight:600; color:#24303a; line-height:1.2; }
        .patient { display:block; margin-top:12px; margin-bottom:10px; font-weight:600; color:#333; font-size:0.98rem; }
        .session-row { margin-top:0; margin-bottom:14px; }
        .session-type { color:#5f6b6f; font-size:0.92rem; display:block; }
        .meta-row { display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-top:0; }
        .meta-row small { color:#6b6b6b; background:transparent; padding:2px 6px; border-radius:6px; }
        .status-pill { background:#e8f3ff; color:#175f9c; padding:6px 10px; border-radius:999px; display:inline-block; font-size:13px; font-weight:600; border:1px solid rgba(23,95,156,0.12); }
        .btn { background:#ffdce6; color:#5a2130; padding:8px 12px; border-radius:8px; border:none; cursor:pointer; box-shadow:0 1px 0 rgba(0,0,0,0.03); }
        .btn:hover { transform:translateY(-1px); }
        .btn.ghost { background:transparent; border:1px solid rgba(43,43,43,0.06); color:#3b3b3b; }
        .btn.small { padding:6px 8px; font-size:13px; border-radius:6px; }
        .input { width:100%; padding:10px; border-radius:8px; border:1px solid rgba(0,0,0,0.06); box-sizing:border-box; background:#fff; }
        .form-grid { display:grid; gap:12px; grid-template-columns: 1fr; }
        @media (max-width:800px) { .form-grid { grid-template-columns: 1fr } }
        .muted { color:#7a7a7a; font-size:0.9rem; }
        .btn.cancel { background:#dc2626; color:#fff; border:1px solid rgba(139,10,10,0.15); box-shadow: 0 1px 0 rgba(0,0,0,0.04); }
        .btn.cancel:hover { transform:translateY(-1px); filter:brightness(0.95); }
        .btn.small.cancel { padding:6px 8px; font-size:13px; }
        .btn.cancel:disabled { opacity:0.6; cursor:not-allowed; filter:grayscale(0.1); }
        .btn.cancel:focus { outline:2px solid rgba(220,38,38,0.18); }
        .obs { background:#fff; border:1px solid rgba(0,0,0,0.04); padding:10px; border-radius:8px; color:#333; }
        .view-row { display:flex; gap:8px; align-items:center; padding:6px 0; }
      `}</style>

      <section>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
          <h2>Citas</h2>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input
              placeholder="Buscar por paciente, terapeuta, tipo, especialidad, estado o fecha"
              className="input"
              style={{width:420}}
              value={search}
              onChange={e=>setSearch(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <button className="btn" onClick={()=>{
              setCreateForm({ PacienteId: '', TerapeutaId: '', TipoSesionId: '', FechaDate: '', FechaTime: '', DuracionMinutos: 45, Motivo: '' });
              setShowCreate(true);
            }}>Nueva Cita</button>
          </div>
        </div>

        {loading && <div style={{ marginTop: 8 }} className="muted">Filtrando...</div>}
        {error && <div className="error" style={{ marginTop: 8 }}>Error: {error}</div>}

        <div style={{ marginTop: 12 }}>
          {showCreate && (
            <Modal title="Nueva Cita" onClose={()=>{ setShowCreate(false); setCreateError(null) }}>
              <form onSubmit={e=>{ e.preventDefault(); handleCreateSubmit() }}>
                <div className="form-grid" style={{gridTemplateColumns:'1fr 1fr',gap:'18px'}}>
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    <select className="input" value={createForm.PacienteId || ''} onChange={e=>setCreateForm(s=>({...s,PacienteId: e.target.value === '' ? '' : Number(e.target.value)}))}>
                      <option value="">Seleccione paciente</option>
                      {(pacientesList||[]).map(p=> (
                        <option key={p.Id ?? p.id} value={p.Id ?? p.id}>{(p.Nombres || p.nombres || p.nombre || '') + ' ' + (p.Apellidos || p.apellidos || '')}</option>
                      ))}
                    </select>
                    {(() => {
                      const tipos = Array.isArray(tiposList) ? tiposList : [];
                      const tiposTienenId = tipos.length > 0 && (tipos[0].id !== undefined || tipos[0].Id !== undefined);
                      return (
                        <select
                          className="input"
                          value={tiposTienenId ? String(createForm.TipoSesionId) : (createForm.TipoSesionId === '' ? '' : Number(createForm.TipoSesionId))}
                          onChange={async e => {
                            let tipo, value;
                            if (tiposTienenId) {
                              value = e.target.value === '' ? '' : e.target.value;
                              tipo = tipos.find(t => String(t.id ?? t.Id) === value);
                            } else {
                              value = e.target.value === '' ? '' : Number(e.target.value);
                              tipo = tipos[value];
                            }
                            setCreateForm(s => ({ ...s, TipoSesionId: value, TerapeutaId: '', FechaDate: '', FechaTime: '' }));
                            setAvailableDates(new Set());
                            setAvailableSlots([]);
                            setTerapeutasList([]);
                            if (e.target.value === '' || !tipo) return;
                            const especialidadId = tipo.especialidadId ?? tipo.EspecialidadId ?? (tipo.especialidad && tipo.especialidad.id);
                            if (!especialidadId) {
                              window.alert('No se pudo determinar la especialidad para este tipo de sesión. El backend debe enviar el campo especialidadId.');
                              setTerapeutasList([]);
                              return;
                            }
                            try {
                              setLoadingTerapeutasCreate(true);
                              const terapeutas = await apiFetch(`/api/terapeutas?especialidadId=${especialidadId}`);
                              setTerapeutasList(Array.isArray(terapeutas) ? terapeutas : (terapeutas && terapeutas.value) ? terapeutas.value : []);
                            } catch (err) {
                              setTerapeutasList([]);
                            } finally {
                              setLoadingTerapeutasCreate(false);
                            }
                          }}
                        >
                          <option value="">Seleccione tipo de sesión</option>
                          {tiposTienenId
                            ? tipos.map(ts => (
                                <option key={String(ts.id ?? ts.Id)} value={String(ts.id ?? ts.Id)}>{ts.nombre ?? ts.Nombre ?? ts.name}</option>
                              ))
                            : tipos.map((ts, idx) => (
                                <option key={idx} value={idx}>{ts.nombre ?? ts.Nombre ?? ts.name}</option>
                              ))
                          }
                        </select>
                      );
                    })()}
                    <select
                      className="input"
                      value={createForm.TerapeutaId || ''}
                      onChange={onTerapeutaChange}
                      disabled={!createForm.TipoSesionId || loadingTerapeutasCreate}
                    >
                      <option value="">{createForm.TipoSesionId ? 'Seleccione terapeuta' : 'Seleccione tipo de sesión primero'}</option>
                      {(!loadingTerapeutasCreate && (terapeutasList||[]).length>0) && (terapeutasList||[]).map(t=> (
                        <option key={t.Id ?? t.id} value={t.Id ?? t.id}>{((t.Nombres||t.nombres||t.nombre||'') + ' ' + (t.Apellidos||t.apellidos||'')) || (t.especialidadNombre || t.EspecialidadNombre || t.Especialidad?.Nombre || 'Terapeuta')}</option>
                      ))}
                    </select>
                    <input type="number" className="input" value={createForm.DuracionMinutos || ''} onChange={e=>setCreateForm(s=>({...s,DuracionMinutos:Number(e.target.value)}))} />
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
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
                        <select className="input" value={createForm.FechaTime || ''} onChange={e=>setCreateForm(s=>({...s,FechaTime:e.target.value}))}>
                          <option value="">Seleccione hora</option>
                          {availableSlots.map(s=>(
                            <option key={s.inicioIso} value={s.inicioIso}>{formatTime(s.inicioIso)}{s.finIso ? ' - ' + formatTime(s.finIso) : ''}</option>
                          ))}
                        </select>
                      ) : (
                        <input type="time" className="input" value={extractTimeHHMM(createForm.FechaTime)} onChange={e=>setCreateForm(s=>({...s,FechaTime:e.target.value}))} disabled={!createForm.FechaDate || loadingSlots} />
                      )}
                    </div>
                    <input className="input" placeholder="Motivo" value={createForm.Motivo || ''} onChange={e=>setCreateForm(s=>({...s,Motivo:e.target.value}))} />
                  </div>
                  {createError && <div className="error">{createError}</div>}
                  <div style={{gridColumn:'1/3',display:'flex',justifyContent:'flex-end',gap:8}}>
                    <button className="btn" type="submit">Crear</button>
                    <button type="button" className="btn ghost" onClick={()=>{ setShowCreate(false); setCreateError(null) }}>Cancelar</button>
                  </div>
                </div>
              </form>
            </Modal>
          )}

          {showReprogram && reprogramItem && (
            <Modal title={`Reprogramar cita #${reprogramItem.id}`} onClose={()=>{ setShowReprogram(false); setReprogramItem(null); setReprogramError(null); setReprogramAvailableDates(new Set()); setReprogramAvailableSlots([]) }}>
              <form onSubmit={handleReprogramSubmit}>
                <div className="form-grid">
                  <div style={{ width: '100%' }}>
                    {reprogramLoadingAvailableDates ? <small className="muted">Cargando fechas disponibles...</small> : null}
                    {reprogramAvailableDates.size>0 ? <small className="muted">Fechas habilitadas resaltadas en el selector.</small> : null}
                    <DayPicker
                      mode="single"
                      selected={reprogramForm.FechaDate ? parseYmdToDateLocal(reprogramForm.FechaDate) : undefined}
                      onSelect={handleReprogramDaySelect}
                      modifiers={reprogramModifiers}
                      modifiersClassNames={modifiersClassNames}
                      disabled={reprogramDisabled}
                      fromDate={new Date()}
                    />
                  </div>

                  <div>
                    {reprogramLoadingSlots ? <div style={{ padding: 8 }}>Cargando horarios...</div> : null}
                    {!reprogramLoadingSlots && reprogramAvailableSlots && reprogramAvailableSlots.length > 0 ? (
                      <select className="input" value={reprogramForm.FechaTime || ''} onChange={e=>setReprogramForm(s=>({...s,FechaTime:e.target.value}))}>
                        <option value="">Seleccione hora</option>
                        {reprogramAvailableSlots.map(s => (
                          <option key={s.inicioIso} value={s.inicioIso}>{formatTime(s.inicioIso)}{s.finIso ? ' - ' + formatTime(s.finIso) : ''}</option>
                        ))}
                      </select>
                    ) : (
                      <input type="time" className="input" value={extractTimeHHMM(reprogramForm.FechaTime)} onChange={e=>setReprogramForm(f=>({...f,FechaTime:e.target.value}))} disabled={!reprogramForm.FechaDate || reprogramLoadingSlots} />
                    )}
                  </div>

                  <div>
                    <label>Duración</label>
                    <input type="number" className="input" value={45} readOnly disabled style={{ background: '#f5f5f5', color: '#888' }} />
                  </div>

                  {reprogramError && <div className="error">{reprogramError}</div>}
                  <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                    <button className="btn" type="submit" disabled={reprogramLoading}>{reprogramLoading ? 'Guardando...' : 'Reprogramar'}</button>
                    <button type="button" className="btn ghost" onClick={()=>{ setShowReprogram(false); setReprogramItem(null); setReprogramError(null); setReprogramAvailableDates(new Set()); setReprogramAvailableSlots([]) }}>Cancelar</button>
                  </div>
                </div>
              </form>
            </Modal>
          )}

          {showView && viewItem && (
            <Modal title={`Detalle cita #${viewItem.id}`} onClose={()=>{ setShowView(false); setViewItem(null) }}>
              <div style={{display:'grid',gap:8,maxWidth:560}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontSize:16,fontWeight:700}}>{viewItem.pacienteNombre || '—'}</div>
                  <div style={{textAlign:'right'}}><span className="status-pill">{String(viewItem.estado)}</span></div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div style={{color:'#5f6b6f'}}><strong>Terapeuta</strong><div style={{marginTop:6}}>{viewItem.terapeutaNombre || '—'}</div></div>
                  <div style={{color:'#5f6b6f'}}><strong>Especialidad</strong><div style={{marginTop:6}}>{viewItem.especialidadNombre || viewItem.raw?.EspecialidadNombre || viewItem.raw?.especialidadNombre || '—'}</div></div>
                  <div style={{color:'#5f6b6f'}}><strong>Fecha</strong><div style={{marginTop:6}}>{viewItem.fecha ? parseIsoSafe(viewItem.fecha)?.toLocaleString() : '—'}</div></div>
                  <div style={{color:'#5f6b6f'}}><strong>Tipo de sesión</strong><div style={{marginTop:6}}>{viewItem.tipoSesionNombre || '—'}</div></div>
                  <div style={{color:'#5f6b6f'}}><strong>Duración</strong><div style={{marginTop:6}}>{(viewItem.duracion ?? '—') + ' min'}</div></div>
                </div>

                <div style={{marginTop:6}}>
                  <strong>Precio</strong>
                  <div style={{marginTop:6}}>{viewItem.precio != null ? viewItem.precio : '—'}</div>
                </div>

                <div>
                  <strong>Observaciones</strong>
                  <div className="obs" style={{whiteSpace:'pre-wrap',marginTop:8}}>{viewItem.observaciones || '—'}</div>
                </div>

                <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:6}}>
                  <button className="btn" onClick={()=>{ setShowView(false); setViewItem(null) }}>Cerrar</button>
                  {canReprogramEstado(viewItem.estado) && (
                    <button className="btn ghost" onClick={()=>{ setShowView(false); openReprogramModal(viewItem); setViewItem(null) }}>Reprogramar</button>
                  )}
                </div>
              </div>
            </Modal>
          )}

          {/* Lista de citas */}
          {items === null && <div className="card"><div className="spinner" /></div>}
          {items && items.length === 0 && <div className="card">No hay citas</div>}
          {sortedItems && sortedItems.length > 0 && sortedItems.map((c) => (
            <div className="card" key={c.id ?? JSON.stringify(c)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 className="cita-title">
                    {c.fecha ? (function(){ const d=parseIsoSafe(c.fecha); return d ? d.toLocaleString() : String(c.fecha) })() : 'Fecha pendiente'}
                  </h3>
                  <small className="patient">Paciente: {c.pacienteNombre}</small>
                  <div className="session-row">
                    <small className="session-type">Especialidad: {c.especialidadNombre || c.raw?.EspecialidadNombre || c.raw?.especialidadNombre || '—'}</small>
                    <small className="session-type">Tipo de Sesión: {c.tipoSesionNombre}</small>
                    <small className="session-type">Terapeuta: {c.terapeutaNombre || c.raw?.TerapeutaNombre || c.raw?.terapeutaNombre || (c.raw?.terapeuta ? ((c.raw.terapeuta.Nombres || c.raw.terapeuta.nombres || '') + ' ' + (c.raw.terapeuta.Apellidos || c.raw.terapeuta.apellidos || '')).trim() : '—')}</small>
                  </div>

                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <small>Duración: {(c.duracion ?? c.raw?.DuracionMinutos ?? c.raw?.duracionMinutos) ?? '—'} min</small>
                    <small>Precio: {(c.precio ?? c.raw?.Precio ?? c.raw?.precio ?? (c.raw?.tipoSesion?.precio)) != null ? (c.precio ?? c.raw?.Precio ?? c.raw?.precio ?? c.raw?.tipoSesion?.precio) : '—'}</small>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div>
                    <span
                      className="status-pill"
                      style={{
                        background:
                          c.estado === 'Completada' || c.estado === 'Completed' ? '#d6f5ff' // celeste pastel
                        : c.estado === 'Programada' || c.estado === 'Scheduled' ? '#d6c6ff' // lila pastel más notorio
                        : c.estado === 'NoAsistio' || c.estado === 'NoAsistida' ? '#fff9d6' // amarillo pastel
                        : c.estado === 'Cancelada' || c.estado === 'Cancelled' || c.estado === 'Anulada' || c.estado === 'Anulado' ? '#e6ffe6' // verde pastel
                        : '#f5f7fa',
                        color:
                          c.estado === 'Completada' || c.estado === 'Completed' ? '#1a4a5a'
                        : c.estado === 'Programada' || c.estado === 'Scheduled' ? '#6c3ad6'
                        : c.estado === 'NoAsistio' || c.estado === 'NoAsistida' ? '#b89a00'
                        : c.estado === 'Cancelada' || c.estado === 'Cancelled' || c.estado === 'Anulada' || c.estado === 'Anulado' ? '#217a36'
                        : '#222',
                        border:'1px solid #d0d0d0',
                        borderRadius:'6px',
                        padding:'7px 14px',
                        fontWeight:700,
                        fontSize: c.estado === 'Programada' || c.estado === 'Scheduled' ? '18px' : '14px',
                        display:'inline-block',
                        minWidth:'140px',
                        textAlign:'center',
                        boxShadow:'0 2px 8px rgba(44,62,80,0.07)',
                        margin:'2px 0'
                      }}
                    >
                      {String(c.estado)}
                    </span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <button className="btn small" onClick={() => handleView(c)}>Ver detalles</button>
                    {c.pacienteFamiliaId && (
                      <button className="btn small" onClick={() => window.dispatchEvent(new CustomEvent('navigate:familia', { detail: { id: c.pacienteFamiliaId } }))} style={{ marginLeft: 6 }}>Ver familia</button>
                    )}
                    {['Programado','Programada','Scheduled'].includes(translateEstado(c.estado)) && (
                      <button className="btn small" onClick={() => openReprogramModal(c)} style={{ marginLeft: 6 }}>Reprogramar</button>
                    )}
                    <button
                      className="btn small cancel"
                      onClick={() => handleCancel(c)}
                      style={{ marginLeft: 6 }}
                      disabled={!isAuthed}
                      title={!isAuthed ? 'Debe iniciar sesión para anular' : ''}
                    >
                      Anular
                    </button>
                  </div>
                </div>
              </div>

              
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
