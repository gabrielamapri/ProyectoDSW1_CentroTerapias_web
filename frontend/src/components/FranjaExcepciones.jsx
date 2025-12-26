import React, { useEffect, useMemo, useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { apiFetch, apiFetchWithMeta } from '../utils/api'
import Modal from './Modal'

const toKey = (d) => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const fromIso = (s) => {
  if (!s) return null
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export default function FranjaExcepciones() {
  const [terapeutas, setTerapeutas] = useState([])
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [confirmState, setConfirmState] = useState(null) // { title, subtitle, lines, confirmText, cancelText, resolve }

  const [form, setForm] = useState({
    terapeutaId: '',
    mode: 'single', // single | range
    fecha: '',
    desde: '',
    hasta: '',
    motivo: ''
  })

  const [availableDays, setAvailableDays] = useState(new Set())
  const [exceptionDays, setExceptionDays] = useState(new Set())
  const [viewMonth, setViewMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })

  const canSave = useMemo(() => {
    if (!form.terapeutaId) return false
    return form.mode === 'single' ? Boolean(form.fecha) : Boolean(form.desde)
  }, [form])

  const fmtDate = (d) => (d ? String(d).slice(0, 10) : '—')
  const fmtRange = (row) => {
    const f = fmtDate(row.fecha)
    const h = row.hasta ? fmtDate(row.hasta) : null
    return h && h !== f ? `${f} — ${h}` : f
  }
  const fmtTerapeuta = (row) => row.terapeutaNombre || '—'
  const fmtMotivo = (row) => row.motivo?.trim() || '—'

  const firstAvailableDate = useMemo(() => {
    const first = Array.from(availableDays)[0]
    return first ? fromIso(first) : null
  }, [availableDays])

  // Terapeutas
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await apiFetch('/api/terapeutas?page=1&pageSize=500')
        if (alive) setTerapeutas(Array.isArray(res) ? res : res.items || [])
      } catch { /* ignore */ }
    })()
    return () => { alive = false }
  }, [])

  // Tabla
  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const qs = new URLSearchParams()
        qs.set('page', String(page))
        qs.set('pageSize', String(pageSize))
        if (search) qs.set('search', search)
        const res = await apiFetchWithMeta(`/api/franjaexcepciones?${qs.toString()}`)
        if (!alive) return
        setItems(Array.isArray(res.data) ? res.data : [])
        const cnt = res.headers.get('x-total-count')
        setTotal(Number(cnt || (Array.isArray(res.data) ? res.data.length : 0)))
      } catch (e) {
        if (alive) setError(e.message || 'Error al cargar')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [page, pageSize, search, refresh])

  // Calendario (días atendidos y excepciones del mes visible)
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!form.terapeutaId) {
        setAvailableDays(new Set()); setExceptionDays(new Set()); return
      }
      const start = new Date(viewMonth); start.setDate(1)
      const end = new Date(start); end.setMonth(end.getMonth() + 1); end.setDate(0)
      const startStr = toKey(start)
      const endStr = toKey(end)
      try {
        const avail = await apiFetch(
          `/api/franjas/${form.terapeutaId}/available-dates?start=${startStr}&end=${endStr}&duracion=60`
        )
        if (alive) setAvailableDays(new Set((avail || []).map((d) => String(d).slice(0, 10))))
        const qs = new URLSearchParams()
        qs.set('page', '1'); qs.set('pageSize', '500')
        qs.set('from', startStr); qs.set('to', endStr); qs.set('terapeutaId', form.terapeutaId)
        const excRes = await apiFetch(`/api/franjaexcepciones?${qs.toString()}`)
        if (alive) {
          const dates = (excRes || []).map((x) => String(x.fecha || x.Fecha).slice(0, 10))
          setExceptionDays(new Set(dates))
        }
      } catch {
        if (alive) { setAvailableDays(new Set()); setExceptionDays(new Set()) }
      }
    })()
    return () => { alive = false }
  }, [form.terapeutaId, viewMonth, refresh])

  // Al cambiar terapeuta, lleva el mes visible al primer día disponible si existe
  useEffect(() => {
    if (form.terapeutaId && firstAvailableDate) {
      const m = new Date(firstAvailableDate); m.setDate(1); setViewMonth(m)
    }
  }, [form.terapeutaId, firstAvailableDate])

  const reload = () => setRefresh((r) => r + 1)

  // Llama al endpoint de citas y, si hay, pide confirmación
  const checkCitasBeforeSave = async (terapeutaId, inicio, fin) => {
    try {
      const url = `/api/citas/terapeuta/${terapeutaId}/rango-fechas?startDate=${inicio}&endDate=${fin}`
      const citas = await apiFetch(url)
      if (!Array.isArray(citas) || citas.length === 0) return true
      const lines = citas.map((c) => {
        const fecha = String(c.fecha || c.Fecha).slice(0, 16).replace('T', ' ')
        const pac = c.pacienteNombre || c.PacienteNombre || 'Paciente'
        const resp = c.responsableNombre || c.ResponsableNombre || ''
        const tel = c.responsableTelefono || c.ResponsableTelefono || ''
        return `${fecha} — ${pac}${resp ? ` (${resp})` : ''}${tel ? ` · ${tel}` : ''}`
      })
      return await new Promise((resolve) => {
        setConfirmState({
          title: 'Tiene pacientes programados. Avisar a:',
          subtitle: null,
          lines,
          confirmText: 'Guardar Excepción',
          singleButton: true,
          resolve
        })
      })
    } catch (e) {
      return await new Promise((resolve) => {
        setConfirmState({
          title: 'No se pudo verificar citas',
          subtitle: `Error: ${e.message || 'desconocido'}. ¿Deseas continuar de todos modos?`,
          lines: [],
          confirmText: 'Continuar',
          cancelText: 'Cancelar',
          resolve
        })
      })
    }
  }

  const handleSave = async () => {
    if (!canSave) return
    if (form.mode === 'range' && form.desde && form.hasta && form.hasta < form.desde) {
      alert('Hasta no puede ser menor que Desde')
      return
    }
    const inicio = form.mode === 'single' ? form.fecha : form.desde
    const fin = form.mode === 'single' ? form.fecha : (form.hasta || form.desde)
    const ok = await checkCitasBeforeSave(form.terapeutaId, inicio, fin)
    if (!ok) return
    setSaving(true)
    try {
      const body = {
        motivo: form.motivo || null,
        desde: inicio,
        hasta: fin
      }
      await apiFetch(`/api/franjaexcepciones/terapeuta/${form.terapeutaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      reload()
      setViewMonth((v) => new Date(v.getFullYear(), v.getMonth(), 1))
      setForm((s) => ({ ...s, fecha: '', desde: '', hasta: '', motivo: '' }))
    } catch (e) {
      alert(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row) => {
    const id = row.id ?? row.Id
    if (!id) return
    if (!window.confirm('Eliminar la excepción seleccionada?')) return
    try {
      await apiFetch(`/api/franjaexcepciones/${id}`, { method: 'DELETE' })
      reload()
      setViewMonth((v) => new Date(v.getFullYear(), v.getMonth(), 1))
    } catch (e) {
      alert(e.message || 'Error al eliminar')
    }
  }

  // DatePicker helpers
  const highlightDates = [
    { 'react-datepicker__day--highlighted-available': Array.from(availableDays).map(fromIso).filter(Boolean) },
    { 'react-datepicker__day--highlighted-exception': Array.from(exceptionDays).map(fromIso).filter(Boolean) }
  ]
  const dayClassName = (d) => {
    const key = toKey(d)
    if (exceptionDays.has(key)) return 'day-exception'
    if (availableDays.has(key)) return 'day-available'
    return undefined
  }
  const filterDate = (d) => {
    if (!availableDays.size) return true
    return availableDays.has(toKey(d))
  }
  const handleMonthChange = (d) => {
    if (d) { const m = new Date(d); m.setDate(1); setViewMonth(m) }
  }
  const handleSingleChange = (d) => {
    setForm((s) => ({ ...s, fecha: d ? toKey(d) : '' }))
  }

  return (
    <section className="stack gap-12">
      <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Excepciones de Atención</h2>
        <input
          className="input"
          placeholder="Buscar terapeuta..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          style={{ maxWidth: 260 }}
        />
      </div>


      <div className="card stack gap-16" style={{background:'#f8faff', border:'1px solid #e6edff', borderRadius:14, boxShadow:'0 2px 12px rgba(44,62,80,0.06)'}}>
        <div style={{
          display:'grid',
          gap:24,
          gridTemplateColumns:'repeat(5, minmax(160px,1fr))',
          alignItems:'end',
          padding:'12px 0'
        }}>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <label style={{fontWeight:600, color:'#2b3a5a', fontSize:15, marginBottom:2}}>Terapeuta</label>
            <select
              className="input"
              value={form.terapeutaId}
              onChange={(e) => setForm((s) => ({ ...s, terapeutaId: e.target.value }))}
              style={{background:'#f6f8fc', border:'1px solid #dbeafe', borderRadius:8, fontSize:15}}
            >
              <option value="">Seleccione...</option>
              {terapeutas.map((t) => (
                <option key={t.id ?? t.Id} value={t.id ?? t.Id}>
                  {`${t.nombres ?? t.Nombres ?? ''} ${t.apellidos ?? t.Apellidos ?? ''}`.trim() || `Terapeuta ${t.id ?? t.Id}`}
                </option>
              ))}
            </select>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <label style={{fontWeight:600, color:'#2b3a5a', fontSize:15, marginBottom:2}}>Modalidad</label>
            <select
              className="input"
              value={form.mode}
              onChange={(e) => setForm((s) => ({ ...s, mode: e.target.value }))}
              style={{background:'#f6f8fc', border:'1px solid #dbeafe', borderRadius:8, fontSize:15}}
            >
              <option value="single">Fecha específica</option>
              <option value="range">Rango (Desde - Hasta)</option>
            </select>
          </div>

          {form.mode === 'single' ? (
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <label style={{fontWeight:600, color:'#2b3a5a', fontSize:15, marginBottom:2}}>Fecha</label>
              <DatePicker
                selected={form.fecha ? fromIso(form.fecha) : null}
                onChange={handleSingleChange}
                onMonthChange={handleMonthChange}
                highlightDates={highlightDates}
                dayClassName={dayClassName}
                filterDate={filterDate}
                placeholderText="Selecciona fecha"
                calendarStartDay={1}
                openToDate={form.fecha ? fromIso(form.fecha) : (firstAvailableDate || new Date())}
                wrapperClassName="input"
                popperPlacement="bottom"
                style={{fontSize:15}}
              />
            </div>
          ) : (
            <>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <label style={{fontWeight:600, color:'#2b3a5a', fontSize:15, marginBottom:2}}>Desde</label>
                <DatePicker
                  selected={form.desde ? fromIso(form.desde) : null}
                  onChange={(d) => setForm((s) => ({
                    ...s,
                    desde: d ? toKey(d) : '',
                    hasta: s.hasta && s.hasta < (d ? toKey(d) : '') ? '' : s.hasta
                  }))}
                  onMonthChange={handleMonthChange}
                  highlightDates={highlightDates}
                  dayClassName={dayClassName}
                  filterDate={filterDate}
                  placeholderText="Selecciona inicio"
                  calendarStartDay={1}
                  openToDate={form.desde ? fromIso(form.desde) : (firstAvailableDate || new Date())}
                  wrapperClassName="input"
                  popperPlacement="bottom"
                  style={{fontSize:15}}
                />
              </div>

              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <label style={{fontWeight:600, color:'#2b3a5a', fontSize:15, marginBottom:2}}>Hasta</label>
                <DatePicker
                  selected={form.hasta ? fromIso(form.hasta) : null}
                  onChange={(d) => setForm((s) => ({ ...s, hasta: d ? toKey(d) : '' }))}
                  onMonthChange={handleMonthChange}
                  highlightDates={highlightDates}
                  dayClassName={dayClassName}
                  filterDate={filterDate}
                  placeholderText="Selecciona fin"
                  calendarStartDay={1}
                  openToDate={
                    form.desde
                      ? fromIso(form.desde)
                      : (form.hasta ? fromIso(form.hasta) : (firstAvailableDate || new Date()))
                  }
                  minDate={form.desde ? fromIso(form.desde) : null}
                  disabled={!form.desde}
                  wrapperClassName="input"
                  popperPlacement="bottom"
                  style={{fontSize:15}}
                />
              </div>
            </>
          )}

          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <label style={{fontWeight:600, color:'#2b3a5a', fontSize:15, marginBottom:2}}>Motivo (opcional)</label>
            <input
              className="input"
              value={form.motivo}
              onChange={(e) => setForm((s) => ({ ...s, motivo: e.target.value }))}
              placeholder="Motivo breve"
              style={{background:'#f6f8fc', border:'1px solid #dbeafe', borderRadius:8, fontSize:15}}
            />
          </div>

        </div>
      </div>

      <div style={{display:'flex', justifyContent:'flex-end', margin:'18px 0 8px 0'}}>
        <button className="btn primary" disabled={!canSave || saving} onClick={handleSave} style={{fontSize:15, padding:'10px 18px', borderRadius:8, boxShadow:'0 2px 8px rgba(44,62,80,0.08)'}}>
          {saving ? 'Guardando...' : 'Guardar excepción'}
        </button>
      </div>

      <div className="card">
        {error && <div className="error">Error: {error}</div>}
        {loading ? (
          <div className="spinner" />
        ) : (
          <table className="table pastel">
            <thead>
              <tr>
                <th>Fecha / Rango</th>
                <th>Terapeuta</th>
                <th>Motivo</th>
                <th style={{ width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {(items || []).map((row) => (
                <tr key={row.id ?? row.Id}>
                  <td>{fmtRange(row)}</td>
                  <td>{fmtTerapeuta(row)}</td>
                  <td>{fmtMotivo(row)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn ghost small"
                      onClick={() => handleDelete(row)}
                      style={{
                        background: '#ffd166',
                        color: '#111',
                        border: '1px solid #f5b54c',
                        boxShadow: '0 4px 10px rgba(245, 181, 76, 0.25)'
                      }}
                    >
                      Quitar excepción
                    </button>
                  </td>
                </tr>
              ))}
              {!items?.length && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 24 }}>Sin resultados</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div className="muted">Mostrando {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} de {total}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              className="input"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
              style={{ width: 90 }}
            >
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}/pág</option>)}
            </select>
            <button className="btn ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
            <button className="btn ghost" disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
          </div>
        </div>
      </div>

      {confirmState && (
        <Modal title={confirmState.title} onClose={() => { confirmState.resolve(false); setConfirmState(null) }}>
          {confirmState.subtitle && <p className="muted" style={{marginTop:0}}>{confirmState.subtitle}</p>}
          {confirmState.lines && confirmState.lines.length > 0 && (
            <div style={{maxHeight:220, overflow:'auto', margin:'8px 0', padding:'6px 10px', background:'#f7faff', border:'1px solid #e6edff', borderRadius:8}}>
              <ul style={{margin:0, paddingLeft:18}}>
                {confirmState.lines.map((t, i) => (
                  <li key={i} style={{margin:'6px 0', color:'#2f3a5a'}}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:12}}>
            {!confirmState?.singleButton && (
              <button className="btn ghost" onClick={() => { confirmState.resolve(false); setConfirmState(null) }}>{confirmState.cancelText || 'Cancelar'}</button>
            )}
            <button className="btn" onClick={() => { confirmState.resolve(true); setConfirmState(null) }}>{confirmState.confirmText || 'Confirmar'}</button>
          </div>
        </Modal>
      )}
    </section>
  )
}

/* Añade a tu CSS global:
.react-datepicker__day--highlighted-available,
.day-available { background: #e7ffe7; color: #0a0; border-radius: 6px; }

.react-datepicker__day--highlighted-exception,
.day-exception { background: #ffe0e0; color: #c00; border-radius: 6px; }
*/
