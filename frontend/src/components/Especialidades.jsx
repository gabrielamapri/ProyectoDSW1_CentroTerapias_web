import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'
import Modal from './Modal'

export default function Especialidades(){
  const [items,setItems] = useState(null)
  const [editing,setEditing] = useState(null)
  const [error,setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(()=>{
    const url = search ? `/api/especialidades?search=${encodeURIComponent(search)}` : '/api/especialidades'
    apiFetch(url).then(setItems).catch(e=>setError(e.message))
  },[search])

  async function refresh(){
    const url = search ? `/api/especialidades?search=${encodeURIComponent(search)}` : '/api/especialidades'
    const res = await apiFetch(url)
    setItems(res)
  }

  async function handleDelete(it){
    const id = it.id ?? it.Id
    if(!id) return alert('ID no disponible')
    if(!confirm('Eliminar especialidad?')) return
    try{ await apiFetch(`/api/especialidades/${id}`,{method:'DELETE'}) ; await refresh() }
    catch(e){ alert('Error: '+(e.message||e)) }
  }

  async function handleSave(obj){
    try{
      const payload = { ...obj }
      const id = payload.Id ?? payload.id
      if(id) await apiFetch(`/api/especialidades/${id}`,{method:'PUT', body: payload})
      else await apiFetch('/api/especialidades',{method:'POST', body: payload})
      await refresh()
      setEditing(null)
    }catch(e){ alert('Error: '+(e.message||e)) }
  }

  if(error) return <div className="error">Error: {error}</div>
  if(!items) return <div className="card"><div className="spinner"/></div>

  return (
    <section>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
        <h2>Especialidades</h2>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input 
            placeholder="Buscar por nombre" 
            className="input" 
            style={{width:280}} 
            value={search} 
            onChange={e=>setSearch(e.target.value)} 
          />
          <button className="btn" onClick={()=>setEditing({})}>Nueva Especialidad</button>
        </div>
      </div>
      <div style={{marginTop:12}} className="card">
        <table className="table pastel">
          <thead><tr><th>Nombre</th><th>Descripción</th><th>Acciones</th></tr></thead>
          <tbody>
            {items.map(it=> (
              <tr key={it.id ?? it.Id}>
                <td>{it.Nombre ?? it.nombre ?? '—'}</td>
                <td style={{maxWidth:360}}>{it.Descripcion ?? it.descripcion ?? '—'}</td>
                <td className="actions">
                  <button className="btn small" onClick={()=>setEditing(it)}>Editar</button>
                  <button className="btn small ghost" onClick={()=>handleDelete(it)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={`Especialidad ${(editing.Nombre??editing.nombre)||''}`} onClose={()=>setEditing(null)}>
          <form onSubmit={e=>{e.preventDefault(); handleSave(editing)}}>
            <div style={{display:'grid',gap:8}}>
              <input className="input" placeholder="Nombre" value={editing.Nombre ?? editing.nombre ?? ''} onChange={e=>setEditing(s=>({...s,Nombre:e.target.value}))} />
              <textarea className="input" placeholder="Descripción" value={editing.Descripcion ?? editing.descripcion ?? ''} onChange={e=>setEditing(s=>({...s,Descripcion:e.target.value}))} />
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
