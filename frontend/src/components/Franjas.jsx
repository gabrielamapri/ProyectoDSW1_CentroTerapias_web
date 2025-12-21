import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'
import Modal from './Modal'

export default function Franjas(){
  const [items,setItems] = useState(null)
  const [editing,setEditing] = useState(null)
  const [error,setError] = useState(null)

  useEffect(()=>{
    apiFetch('/api/franjas').then(setItems).catch(e=>setError(e.message))
  },[])

  async function refresh(){ const res = await apiFetch('/api/franjas'); setItems(res) }

  async function handleDelete(it){
    const id = it.id ?? it.Id
    if(!id) return alert('ID no disponible')
    if(!confirm('Eliminar franja?')) return
    try{ await apiFetch(`/api/franjas/${id}`,{method:'DELETE'}); await refresh() }
    catch(e){ alert('Error: '+(e.message||e)) }
  }

  async function handleSave(obj){
    try{ const payload = {...obj}; const id = payload.Id ?? payload.id; if(id) await apiFetch(`/api/franjas/${id}`,{method:'PUT', body: payload}); else await apiFetch('/api/franjas',{method:'POST', body: payload}); await refresh(); setEditing(null)}catch(e){alert('Error: '+(e.message||e))}
  }

  if(error) return <div className="error">Error: {error}</div>
  if(!items) return <div className="card"><div className="spinner"/></div>

  return (
    <section>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2>Franjas de Disponibilidad</h2>
        <button className="btn" onClick={()=>setEditing({})}>Nueva Franja</button>
      </div>
      <div style={{marginTop:12}} className="card">
        <table className="table pastel">
          <thead><tr><th>TerapeutaId</th><th>Fecha</th><th>Día</th><th>Hora Inicio</th><th>Hora Fin</th><th>Recurrente</th><th>Acciones</th></tr></thead>
          <tbody>
            {items.map(it=> (
              <tr key={it.id ?? it.Id}>
                <td>{it.TerapeutaId ?? it.terapeutaId ?? '—'}</td>
                <td>{it.Fecha ? new Date(it.Fecha).toLocaleDateString() : (it.fecha ? new Date(it.fecha).toLocaleDateString() : '—')}</td>
                <td>{it.DiaSemana ?? it.diaSemana ?? '—'}</td>
                <td>{it.HoraInicio ?? it.horaInicio ?? '—'}</td>
                <td>{it.HoraFin ?? it.horaFin ?? '—'}</td>
                <td>{String(it.Recurrente ?? it.recurrente ?? false)}</td>
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
        <Modal title={`Franja ${(editing.Id||editing.id)||''}`} onClose={()=>setEditing(null)}>
          <form onSubmit={e=>{e.preventDefault(); handleSave(editing)}}>
            <div style={{display:'grid',gap:8}}>
              <input className="input" placeholder="TerapeutaId" value={editing.TerapeutaId ?? editing.terapeutaId ?? ''} onChange={e=>setEditing(s=>({...s,TerapeutaId:Number(e.target.value)}))} />
              <input type="date" className="input" placeholder="Fecha" value={(editing.Fecha ?? editing.fecha) || ''} onChange={e=>setEditing(s=>({...s,Fecha:e.target.value}))} />
              <input type="number" min={0} max={6} className="input" placeholder="Día semana (0-6)" value={editing.DiaSemana ?? editing.diaSemana ?? ''} onChange={e=>setEditing(s=>({...s,DiaSemana:Number(e.target.value)}))} />
              <input type="time" className="input" placeholder="Hora inicio" value={editing.HoraInicio ?? editing.horaInicio ?? ''} onChange={e=>setEditing(s=>({...s,HoraInicio:e.target.value}))} />
              <input type="time" className="input" placeholder="Hora fin" value={editing.HoraFin ?? editing.horaFin ?? ''} onChange={e=>setEditing(s=>({...s,HoraFin:e.target.value}))} />
              <label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={!!(editing.Recurrente ?? editing.recurrente)} onChange={e=>setEditing(s=>({...s,Recurrente:e.target.checked}))} /> Recurrente</label>
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
