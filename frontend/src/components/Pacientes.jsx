import React, { useEffect, useState } from 'react'
import { apiFetch, apiFetchWithMeta } from '../utils/api'
import Modal from './Modal'

export default function Pacientes() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [sexoOptions, setSexoOptions] = useState(null)
  const [familiasList, setFamiliasList] = useState([])
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
        const ep = `/api/pacientes?${q.join('&')}`
        const res = await apiFetchWithMeta(ep)
        if (!mounted) return
        setItems(res.data)
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

  // Normalize incoming sexo values to a code string ('0','1','2','3') or ''
  function normalizeSexoCode(v) {
    if (v === null || v === undefined || v === '') return ''
    const s = String(v).trim()
    if (!s) return ''
    if (/^\d+$/.test(s)) {
      const iv = Number(s)
      if (iv === 0 || iv === 1) return String(iv)
      return ''
    }
    const sl = s.toLowerCase()
    if (sl.startsWith('mas')) return '0'
    if (sl.startsWith('fem')) return '1'
    return ''
  }

  function sexoLabel(v) {
    const code = normalizeSexoCode(v)
    if (!code) return '—'
    const n = Number(code)
    if (n === 0) return 'Masculino'
    if (n === 1) return 'Femenino'
    return String(code)
  }

  useEffect(() => {
    let mounted = true
    async function loadSexo() {
      setSexoOptions([
        { value: '0', label: 'Masculino' },
        { value: '1', label: 'Femenino' }
      ])
    }
    loadSexo()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    async function loadFamilias() {
      try {
        const res = await apiFetch('/api/familias')
        if (!mounted) return
        setFamiliasList(Array.isArray(res) ? res : [])
      } catch (e) {
        // ignore; keep empty list
      }
    }
    loadFamilias()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    function onOpenCreate(e){
      const d = e.detail || {}
      const famId = d.familiaId ?? d.FamiliaId ?? d.id ?? d.Id ?? null
      if (famId) {
        // when opened from a family context, prefill the FamiliaId but keep the field read-only
        setEditing({ FamiliaId: famId, __prefillFamilia: true })
      } else {
        setEditing({ __showFamilySelect: false })
      }
      try { setPage(1) } catch {}
    }
    window.addEventListener('open:create:paciente', onOpenCreate)
    return () => window.removeEventListener('open:create:paciente', onOpenCreate)
  }, [])

  useEffect(() => {
    function onRefreshPacientes() {
      // Recargar la tabla actual de pacientes
      const q = []
      q.push(`page=${page}`)
      q.push(`pageSize=${pageSize}`)
      if (search) q.push(`search=${encodeURIComponent(search)}`)
      
      async function reloadData() {
        try {
          const res = await apiFetchWithMeta(`/api/pacientes?${q.join('&')}`)
          setItems(res.data)
          const cnt = res.headers.get('x-total-count') || (Array.isArray(res.data) ? String(res.data.length) : '0')
          setTotal(Number(cnt))
        } catch (e) {
          console.warn('Error recargando pacientes:', e)
        }
      }
      reloadData()
    }
    window.addEventListener('refresh:pacientes', onRefreshPacientes)
    return () => window.removeEventListener('refresh:pacientes', onRefreshPacientes)
  }, [page, pageSize, search])

  async function handleDelete(p) {
    const id = p.Id ?? p.id
    if (!id) return alert('ID de paciente no disponible')
    if (!confirm('¿Eliminar paciente? Esta acción no se puede deshacer.')) return
    try {
      const resp = await fetch(`/api/pacientes/${id}`, { method: 'DELETE' })
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}))
        throw new Error(body.message || 'No se pudo eliminar')
      }
      // refrescar respetando paginación/búsqueda actuales
      const q = []
      q.push(`page=${page}`)
      q.push(`pageSize=${pageSize}`)
      if (search) q.push(`search=${encodeURIComponent(search)}`)
      const res = await apiFetchWithMeta(`/api/pacientes?${q.join('&')}`)
      setItems(res.data)
    } catch (err) {
      alert('Error al eliminar: ' + (err?.message || err))
    }
  }

  function handleEdit(p) {
    setEditing({ ...p, Sexo: normalizeSexoCode(p.Sexo ?? p.sexo) })
  }

  async function handleSaveEdit(updated) {
    const id = updated.Id ?? updated.id
    try {
      const payload = { ...updated }
      const s = normalizeSexoCode(updated.Sexo ?? updated.sexo)
      payload.Sexo = s && /^\d+$/.test(s) ? String(Number(s)) : String(s || '3')
      delete payload.AgeInYears
      delete payload.ageInYears
      const rawDate = updated.FechaNacimiento ?? updated.fechaNacimiento
      if (rawDate) {
        try {
          const dateStr = String(rawDate).slice(0, 10)
          payload.FechaNacimiento = dateStr
        } catch (e) { /* ignore */ }
      }
      if (payload.FamiliaId === '' || payload.FamiliaId === null || payload.FamiliaId === undefined) {
        delete payload.FamiliaId
      }
      const nombreContacto = payload.NombreContactoEmergencia ?? payload.nombreContactoEmergencia
      const numeroContacto = payload.NumeroContactoEmergencia ?? payload.numeroContactoEmergencia
      if ((nombreContacto && !numeroContacto) || (!nombreContacto && numeroContacto)) {
        return alert('Si proporciona contacto de emergencia, debe incluir nombre y número')
      }
      try { console.log('PACIENTE_PAYLOAD', payload) } catch (e) {}
      if (id) {
        await apiFetch(`/api/pacientes/${id}`, { method: 'PUT', body: payload })
      } else {
        await apiFetch('/api/pacientes', { method: 'POST', body: payload })
      }
      const q = []
      q.push(`page=${page}`)
      q.push(`pageSize=${pageSize}`)
      if (search) q.push(`search=${encodeURIComponent(search)}`)
      const res = await apiFetchWithMeta(`/api/pacientes?${q.join('&')}`)
      setItems(res.data)
      setEditing(null)
    } catch (err) {
      alert('Error al guardar: ' + (err?.message || err))
    }
  }

  const isEditingExisting = !!(editing && (editing.Id ?? editing.id))

  if (error) return <div className="error">Error: {error}</div>
  if (!items) return <div className="card"><div className="spinner" /></div>

  return (
    <section>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
        <h2>Pacientes</h2>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input placeholder="Buscar por nombre, apellido o dni" className="input" style={{width:320}} value={search} onChange={e=>{ setSearch(e.target.value); setPage(1) }} />
          <button className="btn" onClick={() => setEditing({ __showFamilySelect: false })}>Nuevo Paciente</button>
        </div>
      </div>
      <div style={{marginTop:12}} className="card">
        <table className="table pastel">
          <thead>
            <tr>
              <th>Nombres</th>
              <th>Apellidos</th>
              <th>DNI</th>
              <th>Edad</th>
              <th>Sexo</th>
              <th>Familia</th>
              <th>Emergencia (nombre)</th>
              <th>Emergencia (tel)</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(items || []).map((p) => (
              <tr key={p.Id || p.id || JSON.stringify(p)}>
                <td>{p.Nombres || p.nombres || '—'}</td>
                <td>{p.Apellidos || p.apellidos || '—'}</td>
                <td>{p.DNI ?? p.dni ?? p.Dni ?? '—'}</td>
                <td>{p.AgeInYears ?? p.ageInYears ?? '—'}</td>
                <td>{sexoLabel(p.Sexo ?? p.sexo)}</td>
                <td>
                  {p.FamiliaId || p.familiaId ? (
                    <button className="btn small" onClick={() => window.dispatchEvent(new CustomEvent('navigate:familia', { detail: { id: p.FamiliaId ?? p.familiaId } }))}>Ver familia</button>
                    ) : (
                    <button className="btn small ghost" onClick={() => window.dispatchEvent(new CustomEvent('navigate:familia', { detail: { id: null, openCreate: true, patientId: p.Id ?? p.id } }))}>Añadir familia</button>
                  )}
                </td>
                <td>{p.NombreContactoEmergencia || p.nombreContactoEmergencia || '—'}</td>
                <td>{p.NumeroContactoEmergencia || p.numeroContactoEmergencia || '—'}</td>
                <td className="actions">
                  <button className="btn small" onClick={() => handleEdit(p)}>Editar</button>
                  <button className="btn small ghost" onClick={() => handleDelete(p)}>Eliminar</button>
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
        <Modal title={`Editar paciente ${editing.Nombres || editing.nombres || ''}`} onClose={() => setEditing(null)}>
          <form onSubmit={(e)=>{e.preventDefault(); handleSaveEdit(editing)}}>
            <div style={{display:'grid',gap:8}}>
              <input placeholder="Nombres" aria-label="Nombres" value={(editing.Nombres ?? editing.nombres) || ''} onChange={e=>setEditing(s=>({...s,Nombres:e.target.value}))} className="input" />
              <input placeholder="Apellidos" aria-label="Apellidos" value={(editing.Apellidos ?? editing.apellidos) || ''} onChange={e=>setEditing(s=>({...s,Apellidos:e.target.value}))} className="input" />
              <input placeholder="DNI" aria-label="DNI" value={(editing.DNI ?? editing.dni ?? editing.Dni) || ''} onChange={e=>setEditing(s=>({...s,DNI:e.target.value}))} className="input" />
              <input
                type="date"
                placeholder="Fecha de nacimiento"
                aria-label="Fecha de nacimiento"
                value={(editing.FechaNacimiento ?? editing.fechaNacimiento) || ''}
                onChange={e=>setEditing(s=>({...s,FechaNacimiento:e.target.value}))}
                min="1900-01-01"
                max={new Date().toISOString().slice(0,10)}
                className="input"
              />
              {!isEditingExisting && (
                (editing.__prefillFamilia ? (
                  // show family as read-only when opened from a family context
                  (() => {
                    const fid = (editing.FamiliaId ?? editing.familiaId)
                    const fam = familiasList.find(x => String(x.id ?? x.Id) === String(fid))
                    const famLabel = fam ? (((fam.responsable1Nombre || fam.responsable1Apellido) ? `${fam.responsable1Nombre ?? ''} ${fam.responsable1Apellido ?? ''}`.trim() : (fam.ResponsableNombre ?? fam.responsableNombre ?? fam.nombre ?? fam.name)) || `Familia ${fam.id ?? fam.Id}`) : (fid ? `Familia ${fid}` : '—')
                    return (
                      <div>
                        <label style={{display:'block',marginBottom:6}}>Familia</label>
                        <div className="input" style={{padding:8,background:'#f3f4f6',borderRadius:6}}>{famLabel}</div>
                      </div>
                    )
                  })()
                ) : (
                  // otherwise allow selecting a family when requested
                  (((editing.FamiliaId ?? editing.familiaId) !== undefined && (editing.FamiliaId ?? editing.familiaId) !== null) || editing.__showFamilySelect) && (
                    <select aria-label="FamiliaId" value={(editing.FamiliaId ?? editing.familiaId) ?? ''} onChange={e=>setEditing(s=>({...s,FamiliaId: e.target.value === '' ? '' : Number(e.target.value)}))} className="input">
                      <option value="">Seleccionar familia</option>
                      {familiasList.map(f => (
                        <option key={f.id ?? f.Id} value={f.id ?? f.Id}>
                          {((f.responsable1Nombre || f.responsable1Apellido) ? `${f.responsable1Nombre ?? ''} ${f.responsable1Apellido ?? ''}`.trim() : (f.ResponsableNombre ?? f.responsableNombre ?? f.nombre ?? f.name)) || `Familia ${f.id ?? f.Id}`}
                        </option>
                      ))}
                    </select>
                  )
                ))
              )}
              <select aria-label="Sexo" value={(editing.Sexo ?? editing.sexo) || ''} onChange={e=>setEditing(s=>({...s,Sexo:e.target.value}))} className="input">
                <option value="">Seleccionar sexo</option>
                {(sexoOptions || []).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <input placeholder="Contacto emergencia (nombre)" aria-label="Nombre contacto emergencia" value={(editing.NombreContactoEmergencia ?? editing.nombreContactoEmergencia) || ''} onChange={e=>setEditing(s=>({...s,NombreContactoEmergencia:e.target.value}))} className="input" />
              <input placeholder="Contacto emergencia (tel)" aria-label="Número de contacto de emergencia" value={(editing.NumeroContactoEmergencia ?? editing.numeroContactoEmergencia) || ''} onChange={e=>setEditing(s=>({...s,NumeroContactoEmergencia:e.target.value}))} className="input" />
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
