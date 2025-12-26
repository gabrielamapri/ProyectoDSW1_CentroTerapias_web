import React, { useEffect, useState } from 'react'
import { apiFetch, apiFetchWithMeta } from '../utils/api'
import Modal from './Modal'

export default function Terapeutas() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const userRole = localStorage.getItem('userRole') || '';
  const userEmail = localStorage.getItem('userEmail') || '';
  const isPadreFamilia = userRole.toLowerCase() === 'padre' && userEmail.trim().toLowerCase() === 'familia@centro.local';
    // ...existing code...
  // (eliminado: declaración duplicada de error)
  const [editing, setEditing] = useState(null)
  const [especialidades, setEspecialidades] = useState([])
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
        if (search) {
          const normalize = (s) => s ? s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() : ''
          const ns = normalize(search)
          const found = (especialidades || []).find(e => normalize(e.Nombre ?? e.nombre ?? e.name).includes(ns))
          if (found) q.push(`especialidadId=${found.id ?? found.Id}`)
          else q.push(`search=${encodeURIComponent(search)}`)
        }
        const ep = `/api/terapeutas?${q.join('&')}`
        const res = await apiFetchWithMeta(ep)
        if (!mounted) return
        setItems(res.data || [])
        const cnt = res.headers.get('x-total-count') || (Array.isArray(res.data) ? String(res.data.length) : '0')
        setTotal(Number(cnt))
      } catch (e) {
        if (!mounted) return
        setError(e.message)
      }
    }
    load()
    return () => { mounted = false }
  }, [page, pageSize, search, especialidades])

  useEffect(() => {
    apiFetch('/api/especialidades')
      .then((res) => {
        const list = Array.isArray(res) ? res : (res && Array.isArray(res.value) ? res.value : [])
        setEspecialidades(list)
      })
      .catch(() => setEspecialidades([]))
  }, [])

  if (isPadreFamilia) {
    if (!items) return <div className="card"><div className="spinner" /></div>;
    return (
      <section>
        <h2>Terapeutas</h2>
        <div style={{marginTop:12}} className="card">
          <table className="table pastel">
            <thead>
              <tr>
                <th>Nombres</th>
                <th>Apellidos</th>
                <th>Especialidad</th>
                <th>Presentación</th>
              </tr>
            </thead>
            <tbody>
              {(items || []).map((t) => (
                <tr key={t.id || t.Id || JSON.stringify(t)}>
                  <td>{t.Nombres ?? t.nombres ?? t.nombre ?? '—'}</td>
                  <td>{t.Apellidos ?? t.apellidos ?? '—'}</td>
                  <td>{t.especialidadNombre ?? t.EspecialidadNombre ?? t.Especialidad?.Nombre ?? t.Especialidad ?? '—'}</td>
                  <td style={{maxWidth:340}}>{t.Presentacion ?? t.presentacion ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  if (error) return <div className="error">Error: {error}</div>
  if (!items) return <div className="card"><div className="spinner" /></div>

  async function refreshList() {
    const q = []
    q.push(`page=${page}`)
    q.push(`pageSize=${pageSize}`)
    if (search) {
      const normalize = (s) => s ? s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() : ''
      const ns = normalize(search)
      const found = (especialidades || []).find(e => normalize(e.Nombre ?? e.nombre ?? e.name).includes(ns))
      if (found) q.push(`especialidadId=${found.id ?? found.Id}`)
      else q.push(`search=${encodeURIComponent(search)}`)
    }
    const ep = `/api/terapeutas?${q.join('&')}`
    const res = await apiFetchWithMeta(ep)
    setItems(res.data || [])
    const cnt = res.headers.get('x-total-count') || (Array.isArray(res.data) ? String(res.data.length) : '0')
    setTotal(Number(cnt))
  }

  async function handleDelete(t) {
    const id = t.id ?? t.Id
    if (!id) return alert('ID de terapeuta no disponible')
    if (!confirm('¿Eliminar terapeuta? Esta acción no se puede deshacer.')) return
    try {
      const resp = await fetch(`/api/terapeutas/${id}`, { method: 'DELETE' })
      if (!resp.ok) {
        let msg = 'No se pudo eliminar'
        try {
          const body = await resp.json()
          msg = body?.message || msg
        } catch {}
        throw new Error(msg)
      }
      await refreshList()
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
      payload.EspecialidadId = payload.EspecialidadId ? Number(payload.EspecialidadId) : null
      if (id) {
        await apiFetch(`/api/terapeutas/${id}`, { method: 'PUT', body: payload })
      } else {
        await apiFetch('/api/terapeutas', { method: 'POST', body: payload })
      }
      await refreshList()
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
          <input
            placeholder="Buscar por nombre, apellido, especialidad o dni"
            className="input"
            style={{width:320}}
            value={search}
            onChange={e=>{ setSearch(e.target.value); setPage(1) }}
          />
          <button className="btn" onClick={() => setEditing({})}>Nuevo Terapeuta</button>
        </div>
      </div>
      <div style={{marginTop:12}} className="card">
        <table className="table pastel">
          <thead>
            <tr>
              <th>Nombres</th>
              <th>Apellidos</th>
              <th>DNI</th>
              <th>Correo</th>
              <th>Especialidad</th>
              <th>Presentación</th>
              <th>Teléfono</th>
              <th>Dirección</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(items || []).map((t) => (
              <tr key={t.id || t.Id || JSON.stringify(t)}>
                <td>{t.Nombres ?? t.nombres ?? t.nombre ?? '—'}</td>
                <td>{t.Apellidos ?? t.apellidos ?? '—'}</td>
                <td>{t.DNI ?? t.Dni ?? t.dni ?? '—'}</td>
                <td>{t.Correo ?? t.correo ?? t.email ?? t.Email ?? '—'}</td>
                <td>{t.especialidadNombre ?? t.EspecialidadNombre ?? t.Especialidad?.Nombre ?? t.Especialidad ?? '—'}</td>
                <td style={{maxWidth:340}}>{t.Presentacion ?? t.presentacion ?? '—'}</td>
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
        <Modal title={`${(editing.Id || editing.id) ? 'Editar terapeuta' : 'Nuevo terapeuta'} ${(editing.Nombres ?? editing.nombre) || ''}`} onClose={() => setEditing(null)}>
          <form onSubmit={(e)=>{e.preventDefault(); handleSaveEdit(editing)}}>
            <div style={{display:'grid',gap:8}}>
              <input placeholder="Nombres" aria-label="Nombres" className="input" value={editing.Nombres ?? editing.nombres ?? ''} onChange={e=>setEditing(s=>({...s,Nombres:e.target.value}))} />
              <input placeholder="Apellidos" aria-label="Apellidos" className="input" value={editing.Apellidos ?? editing.apellidos ?? ''} onChange={e=>setEditing(s=>({...s,Apellidos:e.target.value}))} />
              <input placeholder="DNI" aria-label="DNI" className="input" value={editing.DNI ?? editing.Dni ?? editing.dni ?? ''} onChange={e=>setEditing(s=>({...s,DNI:e.target.value}))} />
              <input placeholder="Correo" aria-label="Correo" className="input" value={editing.Correo ?? editing.correo ?? editing.email ?? ''} onChange={e=>setEditing(s=>({...s,Correo:e.target.value}))} />
              <select className="input" aria-label="Especialidad" value={editing.EspecialidadId ?? editing.especialidadId ?? ''} onChange={e=>setEditing(s=>({...s,EspecialidadId:e.target.value ? Number(e.target.value) : null}))}>
                <option value="">Sin especialidad</option>
                {(especialidades || []).map(es => (
                  <option key={es.id ?? es.Id} value={(es.id ?? es.Id)}>{es.Nombre ?? es.nombre ?? es.name}</option>
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