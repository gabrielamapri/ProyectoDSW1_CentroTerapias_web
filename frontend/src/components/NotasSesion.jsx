import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'
import Modal from './Modal'

export default function NotasSesion(){
  const [items,setItems] = useState(null)
  const [editing,setEditing] = useState(null)
  const [error,setError] = useState(null)

  useEffect(()=>{
    (async()=>{
      try{
        const res = await apiFetch('/api/NotasSesion')
        if(Array.isArray(res)){ setItems(res); return }
      }catch(e){}
      setError('No se pudo cargar notas de sesión')
    })()
  },[])

  async function refresh(){ const res = await apiFetch('/api/NotasSesion'); setItems(res) }

  async function handleDelete(it){
    const id = it.id ?? it.Id
    if(!id) return alert('ID no disponible')
    if(!confirm('Eliminar nota?')) return
    try{ await apiFetch(`/api/NotasSesion/${id}`,{method:'DELETE'}); await refresh() }
    catch(e){ alert('Error: '+(e.message||e)) }
  }

  async function handleSave(obj){
    try{
      const payload = {...obj}
      const id = payload.Id ?? payload.id
      if(id) await apiFetch(`/api/NotasSesion/${id}`,{method:'PUT', body: payload})
      else await apiFetch('/api/NotasSesion',{method:'POST', body: payload})
      await refresh()
      setEditing(null)
    }catch(e){alert('Error: '+(e.message||e))}
  }

  if(error) return <div className="error">Error: {error}</div>
  if(!items) return <div className="card"><div className="spinner"/></div>

  return (
    <section>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2>Notas de Sesión</h2>
        <button className="btn" onClick={()=>setEditing({})}>Nueva Nota</button>
      </div>
      <div style={{marginTop:12}} className="card">
        <table className="table pastel">
          <thead><tr><th>Paciente</th><th>Terapeuta</th><th>Notas</th><th>Fecha</th><th>Acciones</th></tr></thead>
          <tbody>
            {items.map(it=> (
              <tr key={it.id ?? it.Id}>
                <td>{it.PacienteNombre ?? it.pacienteNombre ?? (it.CitaId ?? it.citaId ?? '—')}</td>
                <td>{it.TerapeutaNombre ?? it.terapeutaNombre ?? (it.TerapeutaId ?? it.terapeutaId ?? '—')}</td>
                <td style={{maxWidth:420}}>{it.Notas ?? it.notas ?? ''}</td>
                <td>{it.FechaCreacion ? new Date(it.FechaCreacion).toLocaleString() : (it.fechaCreacion ? new Date(it.fechaCreacion).toLocaleString() : '—')}</td>
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
        <Modal title={`Nota ${(editing.Id||editing.id)||''}`} onClose={()=>setEditing(null)}>
          <form onSubmit={e=>{e.preventDefault(); handleSave(editing)}}>
            <div style={{display:'grid',gap:8}}>
              <input className="input" placeholder="CitaId" value={editing.CitaId ?? editing.citaId ?? ''} onChange={e=>setEditing(s=>({...s,CitaId:Number(e.target.value)}))} />
              <input className="input" placeholder="TerapeutaId" value={editing.TerapeutaId ?? editing.terapeutaId ?? ''} onChange={e=>setEditing(s=>({...s,TerapeutaId:Number(e.target.value)}))} />
              <textarea className="input" placeholder="Notas" value={editing.Notas ?? editing.notas ?? ''} onChange={e=>setEditing(s=>({...s,Notas:e.target.value}))} />
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
