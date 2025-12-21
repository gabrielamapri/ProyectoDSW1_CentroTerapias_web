import React, { useEffect, useState } from 'react'
import { apiFetch, apiFetchWithMeta } from '../utils/api'
import Modal from './Modal'

export default function Terapeutas() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [especialidades, setEspecialidades] = useState([])
  const [displayItems, setDisplayItems] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const q = []
        q.push(`page=${page}`)
        q.push(`pageSize=${pageSize}`)
        if (search) q.push(`search=${encodeURIComponent(search)}`)
        const ep = `/api/terapeutas?${q.join('&')}`
        const res = await apiFetchWithMeta(ep)
        if (!mounted) return
        setItems(res.data || [])
        try { console.debug('API /api/terapeutas -> data', res.data) } catch (e) {}
        const cnt = res.headers.get('x-total-count') || (Array.isArray(res.data) ? String(res.data.length) : '0')
        setTotal(Number(cnt))
      } catch (e) {
        if (!mounted) return
        setError(e.message)
      }
    }
    load()
    return () => { mounted = false }
  }, [page, pageSize, search])

  useEffect(() => {
    apiFetch('/api/especialidades')
      .then((res) => { setEspecialidades(Array.isArray(res) ? res : []); try { console.debug('API /api/especialidades ->', res) } catch(e){} })
      .catch(() => setEspecialidades([]))
  }, [])

  useEffect(() => {
    if (!items) { setDisplayItems(null); return }
    try {
      const mapped = (items || []).map(t => {
        const maybeName = t.EspecialidadNombre ?? (t.Especialidad && (typeof t.Especialidad === 'string' ? t.Especialidad : (t.Especialidad.Nombre ?? t.Especialidad.nombre)));
        if (maybeName) return { ...t, EspecialidadDisplay: maybeName }
        const eid = t.EspecialidadId ?? t.especialidadId ?? null
        if (eid && Array.isArray(especialidades) && especialidades.length) {
          const found = especialidades.find(e => String(e.id ?? e.Id) === String(eid))
          if (found) return { ...t, EspecialidadDisplay: found.Nombre ?? found.nombre ?? found.name ?? '—' }
        }
        return { ...t, EspecialidadDisplay: '—' }
      })
      setDisplayItems(mapped)
      try { console.debug('Computed EspecialidadDisplay for terapeutas', mapped.map(x=>({ id: x.id ?? x.Id, EspecialidadDisplay: x.EspecialidadDisplay }))) } catch(e){}
    } catch(e) {}
  }, [items, especialidades])

  if (error) return <div className="error">Error: {error}</div>
  if (!items) return <div className="card"><div className="spinner" /></div>

  async function handleDelete(t) {
    const id = t.id ?? t.Id
    if (!id) return alert('ID de terapeuta no disponible')
    if (!confirm('¿Eliminar terapeuta? Esta acción no se puede deshacer.')) return
    try {
      await apiFetch(`/api/terapeutas/${id}`, { method: 'DELETE' })
      const refreshed = await apiFetch('/api/terapeutas')
      setItems(refreshed)
    } catch (err) {
      alert('Error al eliminar: ' + (err?.message || err))
    }
  }

  function handleEdit(t) {
    setEditing({ ...t })
  }

  async function handleSaveEdit(updated) {
    const id = updated.Id ?? updated.id
    try {
      const payload = { ...updated }
      // ensure EspecialidadId is numeric or null
      payload.EspecialidadId = payload.EspecialidadId ? Number(payload.EspecialidadId) : null
      if (id) {
        await apiFetch(`/api/terapeutas/${id}`, { method: 'PUT', body: payload })
      } else {
        await apiFetch('/api/terapeutas', { method: 'POST', body: payload })
      }
      const refreshed = await apiFetch('/api/terapeutas')
      setItems(refreshed)
      setEditing(null)
    } catch (err) {
      alert('Error al guardar: ' + (err?.message || err))
    }
  }

  return (
    <section>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
        <h2>Terapeutas</h2>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input placeholder="Buscar por nombre, apellido o dni" className="input" style={{width:320}} value={search} onChange={e=>{ setSearch(e.target.value); setPage(1) }} />
          <button className="btn" onClick={() => setEditing({})}>Nuevo Terapeuta</button>
        </div>
      </div>
      <div style={{marginTop:12}} className="card">
        <table className="table pastel">
          <thead>
            <tr>
              <th>Nombres</th>
              <th>Apellidos</th>
              <th>Especialidad</th>
              <th>Presentación</th>
              <th>Teléfono</th>
              <th>Dirección</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(displayItems || items || []).map((t) => (
              <tr key={t.id || t.Id || JSON.stringify(t)}>
                <td>{t.Nombres ?? t.nombres ?? t.nombre ?? '—'}</td>
                <td>{t.Apellidos ?? t.apellidos ?? '—'}</td>
                <td>{t.EspecialidadDisplay ?? t.especialidadNombre ?? t.EspecialidadNombre ?? (t.Especialidad && (typeof t.Especialidad === 'string' ? t.Especialidad : (t.Especialidad.Nombre ?? t.Especialidad.nombre))) ?? (() => {
                  const eid = t.EspecialidadId ?? t.especialidadId ?? null
                  if (eid) {
                    const found = (especialidades || []).find(e => String(e.id ?? e.Id) === String(eid))
                    if (found) return found.Nombre ?? found.nombre ?? found.name ?? '—'
                  }
                  return '—'
                })()}</td>
                <td style={{maxWidth:340}}>{t.Presentacion ?? t.presentacion ?? t.Presentacion ?? '—'}</td>
                <td>{t.Telefono ?? t.telefono ?? t.phone ?? '—'}</td>
                <td>{t.Direccion ?? t.direccion ?? t.address ?? '—'}</td>
                <td className="actions">
                  <button className="btn small" onClick={() => handleEdit(t)}>Editar</button>
                  <button className="btn small ghost" onClick={() => handleDelete(t)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
          <div className="muted">Mostrando {Math.min((page-1)*pageSize+1, total)}–{Math.min(page*pageSize, total)} de {total}</div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn ghost" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Anterior</button>
            <button className="btn ghost" disabled={page*pageSize>=total} onClick={()=>setPage(p=>p+1)}>Siguiente</button>
          </div>
        </div>
      </div>

      {editing && (
        <Modal title={`Editar terapeuta ${(editing.Nombres ?? editing.nombre) || ''}`} onClose={() => setEditing(null)}>
          <form onSubmit={(e)=>{e.preventDefault(); handleSaveEdit(editing)}}>
            <div style={{display:'grid',gap:8}}>
              <input placeholder="Nombres" aria-label="Nombres" className="input" value={editing.Nombres ?? editing.nombres ?? ''} onChange={e=>setEditing(s=>({...s,Nombres:e.target.value}))} />
              <input placeholder="Apellidos" aria-label="Apellidos" className="input" value={editing.Apellidos ?? editing.apellidos ?? ''} onChange={e=>setEditing(s=>({...s,Apellidos:e.target.value}))} />
              <select className="input" aria-label="Especialidad" value={editing.EspecialidadId ?? editing.especialidadId ?? ''} onChange={e=>setEditing(s=>({...s,EspecialidadId:e.target.value ? Number(e.target.value) : null}))}>
                <option value="">Sin especialidad</option>
                {(especialidades || []).map(es => (
                  <option key={es.id ?? es.Id ?? es.Id} value={(es.id ?? es.Id ?? es.Id)}>{es.Nombre ?? es.nombre ?? es.name}</option>
                ))}
              </select>
              <input placeholder="Presentación / descripción breve" aria-label="Presentación" className="input" value={editing.Presentacion ?? editing.presentacion ?? ''} onChange={e=>setEditing(s=>({...s,Presentacion:e.target.value}))} />
              <input placeholder="Teléfono" aria-label="Teléfono" className="input" value={editing.Telefono ?? editing.telefono ?? ''} onChange={e=>setEditing(s=>({...s,Telefono:e.target.value}))} />
              <input placeholder="Dirección" aria-label="Dirección" className="input" value={editing.Direccion ?? editing.direccion ?? ''} onChange={e=>setEditing(s=>({...s,Direccion:e.target.value}))} />
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button className="btn" type="submit">Guardar</button>
                <button type="button" className="btn ghost" onClick={()=>setEditing(null)}>Cancelar</button>
              </div>
            </div>
          </form>
        </Modal>
      )}
      
    </section>
  )
}

