
import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'
import Modal from './Modal'


export default function TipoSesiones(){
  const [items,setItems] = useState(null)
  const [editing,setEditing] = useState(null)
  const [error,setError] = useState(null)
  const [search, setSearch] = useState('')

  // Detect role/email (usar claves correctas de localStorage)
  const userRole = localStorage.getItem('userRole') || '';
  const userEmail = localStorage.getItem('userEmail') || '';
  const isPadre = userRole.toLowerCase() === 'padre' && userEmail.trim().toLowerCase() === 'familia@centro.local';
  const isTerapeuta = userRole.toLowerCase() === 'terapeuta';

  useEffect(()=>{
    const endpoints = ['/api/tiposesiones','/api/tiposSesiones','/api/tipos-sesiones','/api/tipoSesiones','/api/TipoSesiones']
    let mounted = true
    ;(async()=>{
      for(const ep of endpoints){
        try{
          const url = search ? `${ep}?search=${encodeURIComponent(search)}` : ep
          const res = await apiFetch(url)
          if(!mounted) return
          if(Array.isArray(res)) { setItems(res); return }
        }catch(e){}
      }
      setError('No se pudo cargar tipos de sesión')
    })()
    return ()=> mounted = false
  },[search])

  async function refresh(){ 
    const url = search ? `/api/tiposesiones?search=${encodeURIComponent(search)}` : '/api/tiposesiones'
    const res = await apiFetch(url)
    setItems(res)
  }

  async function handleDelete(it){
    const id = it.id ?? it.Id
    if(!id) return alert('ID no disponible')
    if(!confirm('Eliminar tipo de sesión?')) return
    try{ await apiFetch(`/api/tiposesiones/${id}`,{method:'DELETE'}); await refresh() }
    catch(e){ alert('Error: '+(e.message||e)) }
  }

  async function handleSave(obj){
    try{ const payload = {...obj}; const id = payload.Id ?? payload.id; if(id) await apiFetch(`/api/tiposesiones/${id}`,{method:'PUT', body: payload}); else await apiFetch('/api/tiposesiones',{method:'POST', body: payload}); await refresh(); setEditing(null)}catch(e){alert('Error: '+(e.message||e))}
  }

  if(error) return <div className="error">Error: {error}</div>
  if(!items) return <div className="card"><div className="spinner"/></div>

  // Restricción para rol Padre (familia@centro.local)
  if(isPadre){
    return (
      <section>
        <h2>Tipos de Sesión</h2>
        <div style={{marginTop:12}} className="card">
          <table className="table pastel">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Duración (min)</th>
                <th>Precio</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it=> (
                <tr key={it.id ?? it.Id}>
                  <td>{it.Nombre ?? it.nombre ?? it.name ?? '—'}</td>
                  <td>{it.Descripcion ?? it.descripcion ?? ''}</td>
                  <td>{it.DuracionMinutos ?? it.duracionMinutos ?? it.duracion ?? '—'}</td>
                  <td>{(it.Precio ?? it.precio ?? null) != null ? (it.Precio ?? it.precio).toString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  // ...resto para otros roles...
  return (
    <section>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
        <h2>Tipos de Sesión</h2>
        {!(userRole === 'Padre' && userEmail === 'familia@centro.local') && !isTerapeuta && (
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input 
              placeholder="Buscar por nombre" 
              className="input" 
              style={{width:280}} 
              value={search} 
              onChange={e=>setSearch(e.target.value)} 
            />
            <button className="btn" onClick={()=>setEditing({ DuracionMinutos: 45 })}>Nuevo Tipo</button>
          </div>
        )}
      </div>
      <div style={{marginTop:12}} className="card">
        <table className="table pastel">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Duración (min)</th>
                <th>Precio</th>
                {!(userRole === 'Padre' && userEmail === 'familia@centro.local') && !isTerapeuta && <th>Acciones</th>}
              </tr>
            </thead>
          <tbody>
            {items.map(it=> (
              <tr key={it.id ?? it.Id}>
                  <td>{it.Nombre ?? it.nombre ?? it.name ?? '—'}</td>
                  <td>{it.Descripcion ?? it.descripcion ?? ''}</td>
                  <td>{it.DuracionMinutos ?? it.duracionMinutos ?? it.duracion ?? '—'}</td>
                  <td>{(it.Precio ?? it.precio ?? null) != null ? (it.Precio ?? it.precio).toString() : '—'}</td>
                {!(userRole === 'Padre' && userEmail === 'familia@centro.local') && !isTerapeuta && (
                  <td className="actions">
                    <button className="btn small" onClick={()=>setEditing(it)}>Editar</button>
                    <button className="btn small ghost" onClick={()=>handleDelete(it)}>Eliminar</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && !(userRole === 'Padre' && userEmail === 'familia@centro.local') && !isTerapeuta && (
        <Modal title={`Tipo ${(editing.Nombre??editing.nombre)||''}`} onClose={()=>setEditing(null)}>
          <form onSubmit={e=>{e.preventDefault(); const payload = {...editing}; if(payload.DuracionMinutos !== undefined) payload.DuracionMinutos = Number(payload.DuracionMinutos); if(payload.duracionMinutos !== undefined) payload.duracionMinutos = Number(payload.duracionMinutos); if(payload.Precio !== undefined) payload.Precio = Number(payload.Precio); if(payload.precio !== undefined) payload.precio = Number(payload.precio); handleSave(payload)}}>
            <div style={{display:'grid',gap:8}}>
              <input className="input" placeholder="Nombre" value={editing.Nombre ?? editing.nombre ?? ''} onChange={e=>setEditing(s=>({...s,Nombre:e.target.value}))} />
              <textarea className="input" placeholder="Descripción" value={editing.Descripcion ?? editing.descripcion ?? ''} onChange={e=>setEditing(s=>({...s,Descripcion:e.target.value}))} />
                <input className="input" type="number" min="0" placeholder="Duración (min)" value={editing.DuracionMinutos ?? editing.duracionMinutos ?? ''} 
                  onChange={e=>setEditing(s=>({...s,DuracionMinutos:e.target.value}))}
                  readOnly={editing && editing.DuracionMinutos === 45 && !editing.id && !editing.Id}
                />
                <input className="input" type="number" step="0.01" min="0" placeholder="Precio" value={editing.Precio ?? editing.precio ?? ''} onChange={e=>setEditing(s=>({...s,Precio:e.target.value}))} />
              <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
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
