import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'
import Modal from './Modal'

export default function Franjas(){
  const [items,setItems] = useState(null)
  const [editing,setEditing] = useState(null)
  const [error,setError] = useState(null)
  const [therapists,setTherapists] = useState([])

  const dayNames = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

  useEffect(()=>{ apiFetch('/api/franjas').then(setItems).catch(e=>setError(e.message||String(e))) },[])
  useEffect(()=>{ apiFetch('/api/terapeutas').then(setTherapists).catch(()=>setTherapists([])) },[])

  async function refresh(){ try{ const res = await apiFetch('/api/franjas'); setItems(res) }catch(e){ setError(e.message||String(e)) } }

  async function handleDelete(it){
    const id = it.id ?? it.Id
    if(!id) return alert('ID no disponible')
    if(!window.confirm('Eliminar franja?')) return
    try{
      await apiFetch(`/api/franjas/${id}`,{method:'DELETE'})
      await refresh()
    }catch(e){ alert('Error: '+(e.message||e)) }
  }

  function ensureSeconds(t){
    if(!t) return ''
    if(typeof t !== 'string') t = String(t)
    return t.length === 5 ? t + ':00' : t
  }

  function dateForInput(v){
    if(!v) return ''
    if(typeof v === 'string'){
      const d = new Date(v)
      if(!isNaN(d.getTime())) return d.toISOString().slice(0,10)
      return v.length >= 10 ? v.slice(0,10) : ''
    }
    if(v instanceof Date) return v.toISOString().slice(0,10)
    return ''
  }

  function openNew(){
    setEditing({
      TerapeutaId: null,
      TerapeutaNombre: '',
      Fecha: null,
      DiasSemanaArray: [],
      HoraInicio: '09:00',
      HoraFin: '13:00',
      Recurrente: true,
      _showTherapistDropdown: false
    })
  }

  function openEdit(it){
    const diasArr = Array.isArray(it.DiasSemana) && it.DiasSemana.length>0
      ? it.DiasSemana.map(n=>Number(n))
      : (it.DiaSemana !== null && it.DiaSemana !== undefined ? [Number(it.DiaSemana)] : [])
    const isRecurrent = (diasArr && diasArr.length>0) || !!(it.Recurrente ?? it.recurrente)
    const fechaVal = (!isRecurrent && (it.Fecha || it.fecha)) ? dateForInput(it.Fecha ?? it.fecha) : null

    // avoid mixing '??' and '||' without parentheses
    const therapistNameComputed = (it.terapeutaNombre || it.TerapeutaNombre || (it.terapeuta ? ((it.terapeuta.nombres||it.terapeuta.Nombres||'')+' '+(it.terapeuta.apellidos||it.terapeuta.Apellidos||'')).trim() : '')) || ''

    setEditing({
      ...it,
      TerapeutaId: it.TerapeutaId ?? it.terapeutaId ?? (it.terapeuta?.id ?? it.terapeuta?.Id) ?? null,
      TerapeutaNombre: therapistNameComputed,
      DiasSemanaArray: diasArr,
      Fecha: fechaVal,
      Recurrente: isRecurrent,
      _showTherapistDropdown:false
    })
  }

  async function handleSave(obj){
    try{
      const terapeutaRaw = obj.TerapeutaId ?? obj.terapeutaId ?? obj.Terapeuta?.id ?? obj.Terapeuta?.Id
      const TerapeutaId = terapeutaRaw === undefined || terapeutaRaw === null ? null : Number(terapeutaRaw)
      if(!TerapeutaId || isNaN(TerapeutaId) || TerapeutaId <= 0){
        return alert('Selecciona un terapeuta válido desde la lista.')
      }

      let fechaRaw = obj.Fecha ?? obj.fecha ?? null
      if(typeof fechaRaw === 'string'){
        if(fechaRaw.trim() === '') fechaRaw = null
        else {
          const d = new Date(fechaRaw)
          if(isNaN(d.getTime())) return alert('Fecha inválida')
          fechaRaw = d.toISOString()
        }
      } else if(fechaRaw instanceof Date){
        if(isNaN(fechaRaw.getTime())) fechaRaw = null
        else fechaRaw = fechaRaw.toISOString()
      }

      const dias = (obj.DiasSemanaArray && Array.isArray(obj.DiasSemanaArray)) ? obj.DiasSemanaArray.map(n=>Number(n)).filter(n=>!isNaN(n)) : (obj.DiaSemana !== undefined && obj.DiaSemana !== null ? [Number(obj.DiaSemana)] : [])

      const recurrent = !!(obj.Recurrente ?? obj.recurrente)
      if(recurrent){
        if(!dias || dias.length === 0) return alert('Para franjas recurrentes debes seleccionar al menos un día.')
      } else {
        if(!fechaRaw) return alert('Para franjas no recurrentes debes indicar una fecha específica.')
      }

      const HoraInicio = ensureSeconds(obj.HoraInicio ?? obj.horaInicio ?? '')
      const HoraFin = ensureSeconds(obj.HoraFin ?? obj.horaFin ?? '')
      if(!HoraInicio) return alert('Introduce Hora Inicio')
      if(!HoraFin) return alert('Introduce Hora Fin')

      const basePayload = {
        TerapeutaId,
        Fecha: fechaRaw,
        HoraInicio,
        HoraFin,
        Recurrente: recurrent
      }

      const id = obj.Id ?? obj.id
      if(id){
        const diaSingle = (dias && dias.length>0) ? dias[0] : null
        const payload = { ...basePayload, DiaSemana: diaSingle === null ? null : Number(diaSingle) }
        await apiFetch(`/api/franjas/${id}`, { method: 'PUT', body: payload })
      } else {
        if(recurrent && dias && dias.length > 0){
          for(const d of dias){
            const payload = { ...basePayload, DiaSemana: Number(d) }
            await apiFetch('/api/franjas', { method: 'POST', body: payload })
          }
        } else {
          const payload = { ...basePayload, DiaSemana: null }
          await apiFetch('/api/franjas', { method: 'POST', body: payload })
        }
      }

      await refresh()
      setEditing(null)
    }catch(e){ alert('Error: '+(e.message||String(e))) }
  }

  if(error) return <div style={styles.error}>Error: {error}</div>
  if(!items) return <div style={styles.centerCard}><div style={styles.spinner}/></div>

  const formatTime = t => {
    if(!t) return '—'
    if(typeof t === 'string') return t.length>=5 ? t.slice(0,5) : t
    return String(t)
  }

  const therapistName = it => {
    if(!it) return '—'
    if(it.terapeutaNombre) return it.terapeutaNombre
    if(it.TerapeutaNombre) return it.TerapeutaNombre
    const rel = it.terapeuta ?? it.Terapeuta
    if(rel){
      const n = rel.nombres ?? rel.Nombres ?? ''
      const a = rel.apellidos ?? rel.Apellidos ?? ''
      const full = (n + ' ' + a).trim()
      if(full) return full
    }
    return (it.terapeutaId ?? it.TerapeutaId ?? it.id ?? it.Id) ?? '—'
  }

  return (
    <section style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Franjas de Disponibilidad</h2>
        <button style={{...styles.btn, ...styles.btnPrimary}} onClick={openNew}>Nueva Franja</button>
      </div>

      <div style={{marginTop:12}} className="card">
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Terapeuta</th>
              <th style={styles.th}>Fecha</th>
              <th style={styles.th}>Días</th>
              <th style={styles.th}>Hora Inicio</th>
              <th style={styles.th}>Hora Fin</th>
              <th style={styles.th}>Recurrente</th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx)=>{
              const diasDisplay = it.diaSemana ?? it.DiaSemana
              const diasText = (Array.isArray(it.DiasSemana) && it.DiasSemana.length>0)
                ? it.DiasSemana.map(d=>dayNames[Number(d)]).join(', ')
                : (diasDisplay !== null && diasDisplay !== undefined ? dayNames[Number(diasDisplay)] : (it.fecha || it.Fecha ? (new Date(it.Fecha ?? it.fecha)).toLocaleDateString() : '—'))
              return (
                <tr key={it.id ?? it.Id} style={ idx % 2 === 0 ? styles.trEven : styles.trOdd }>
                  <td style={styles.td}>{therapistName(it)}</td>
                  <td style={styles.td}>{it.Fecha ? new Date(it.Fecha).toLocaleDateString() : (it.fecha ? new Date(it.fecha).toLocaleDateString() : '—')}</td>
                  <td style={styles.td}>
                    {Array.isArray(it.DiasSemana) && it.DiasSemana.length>0
                      ? it.DiasSemana.map(d=> <span key={d} style={styles.dayChip}>{dayNames[Number(d)]}</span>)
                      : (diasDisplay !== null && diasDisplay !== undefined ? <span style={styles.dayChip}>{dayNames[Number(diasDisplay)]}</span> : '—')
                    }
                  </td>
                  <td style={styles.td}>{formatTime(it.HoraInicio ?? it.horaInicio)}</td>
                  <td style={styles.td}>{formatTime(it.HoraFin ?? it.horaFin)}</td>
                  <td style={styles.td}>{(it.Recurrente ?? it.recurrente) ? <span style={styles.badge}>Sí</span> : <span style={{...styles.badge, background:'#eee', color:'#333'}}>No</span>}</td>
                  <td style={styles.td}>
                    <button style={{...styles.btn, ...styles.btnSmall}} onClick={()=>openEdit(it)}>Editar</button>
                    <button style={{...styles.btn, ...styles.btnGhost}} onClick={()=>handleDelete(it)}>Eliminar</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={`Franja ${(editing.Id||editing.id)||''}`} onClose={()=>setEditing(null)}>
          <form onSubmit={e=>{e.preventDefault(); handleSave(editing)}}>
            <div style={{display:'grid',gap:8}}>
              <div style={{position:'relative'}}>
                <input
                  className="input"
                  placeholder="Buscar terapeuta (escribe nombre)"
                  value={editing?.TerapeutaNombre ?? editing?.terapeutaNombre ?? ''}
                  onFocus={()=>setEditing(s=>({... (s||{}), _showTherapistDropdown:true}))}
                  onChange={e=>setEditing(s=>({... (s||{}), TerapeutaNombre: e.target.value, TerapeutaId: null, terapeuta: undefined, _showTherapistDropdown:true}))}
                  onBlur={()=>setTimeout(()=>setEditing(s=>({... (s||{}), _showTherapistDropdown:false})),150)}
                  style={styles.input}
                />
                {editing && editing._showTherapistDropdown && (editing.TerapeutaNombre ?? editing.terapeutaNombre ?? '') !== '' && (
                  <div style={styles.dropdown}>
                    {therapists.filter(t=>{
                      const name = ((t.nombres||t.Nombres||'') + ' ' + (t.apellidos||t.Apellidos||'')).toLowerCase()
                      return name.includes((editing.TerapeutaNombre||editing.terapeutaNombre||'').toLowerCase())
                    }).slice(0,15).map(t=>{
                      const display = ((t.nombres||t.Nombres||'') + ' ' + (t.apellidos||t.Apellidos||'')).trim()
                      return (
                        <div
                          key={t.id ?? t.Id}
                          style={styles.dropdownItem}
                          onMouseDown={e=>{ e.preventDefault(); setEditing(s=>({... (s||{}), TerapeutaId: t.id ?? t.Id, TerapeutaNombre: display, terapeuta: t, _showTherapistDropdown:false })) }}
                        >
                          {display}
                        </div>
                      )
                    })}
                    {therapists.filter(t=>{
                      const name = ((t.nombres||t.Nombres||'') + ' ' + (t.apellidos||t.Apellidos||'')).toLowerCase()
                      return name.includes((editing.TerapeutaNombre||editing.terapeutaNombre||'').toLowerCase())
                    }).length === 0 && <div style={{padding:8,color:'#666'}}>No hay coincidencias</div>}
                  </div>
                )}
              </div>

              <label style={{display:'flex',alignItems:'center',gap:8}}>
                <input
                  type="checkbox"
                  checked={!!(editing.Recurrente ?? editing.recurrente)}
                  onChange={e=>{
                    const recurrent = e.target.checked
                    setEditing(s=>{
                      const base = {...(s||{}), Recurrente: recurrent}
                      if(recurrent){
                        return {...base, Fecha: null}
                      } else {
                        return {...base, DiasSemanaArray: []}
                      }
                    })
                  }}
                /> <span style={{color:'#444'}}>Recurrente</span>
              </label>

              { (editing.Recurrente ?? editing.recurrente) ? (
                <div style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'center'}}>
                  {dayNames.map((dn, idx)=> {
                    const checked = (editing?.DiasSemanaArray ?? []).includes(idx)
                    return (
                      <label key={idx} style={{display:'flex',alignItems:'center',gap:6}}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e=>{
                            setEditing(s=>{
                              const arr = Array.isArray(s?.DiasSemanaArray) ? [...s.DiasSemanaArray] : []
                              if(e.target.checked){
                                if(!arr.includes(idx)) arr.push(idx)
                              } else {
                                const i = arr.indexOf(idx); if(i>=0) arr.splice(i,1)
                              }
                              return {...(s||{}), DiasSemanaArray: arr}
                            })
                          }}
                        />
                        <span style={styles.dayLabel}>{dn}</span>
                      </label>
                    )
                  })}
                  <div style={{marginLeft:12,color:'#666',fontSize:13}}>Marca 1 o más días para franjas recurrentes.</div>
                </div>
              ) : (
                <input
                  type="date"
                  className="input"
                  placeholder="Fecha"
                  value={dateForInput(editing.Fecha ?? editing.fecha)}
                  onChange={e=>setEditing(s=>({... (s||{}), Fecha: e.target.value || null}))}
                  style={styles.input}
                />
              )}

              <div style={{display:'flex',gap:8}}>
                <input type="time" className="input" placeholder="Hora inicio" value={editing.HoraInicio ?? editing.horaInicio ?? ''} onChange={e=>setEditing(s=>({... (s||{}), HoraInicio:e.target.value}))} style={styles.timeInput} />
                <input type="time" className="input" placeholder="Hora fin" value={editing.HoraFin ?? editing.horaFin ?? ''} onChange={e=>setEditing(s=>({... (s||{}), HoraFin:e.target.value}))} style={styles.timeInput} />
              </div>

              <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                <button className="btn" type="submit" style={{...styles.btn, ...styles.btnPrimary}}>Guardar</button>
                <button type="button" className="btn ghost" onClick={()=>setEditing(null)} style={{...styles.btn, ...styles.btnGhost}}>Cancelar</button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </section>
  )
}

const styles = {
  container: { padding: 16, fontFamily: 'Inter, Arial, sans-serif', color:'#222' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 },
  title: { margin:0, color:'#2b2b2b' },
  btn: { padding:'8px 12px', border:'none', borderRadius:6, cursor:'pointer', fontWeight:600 },
  btnPrimary: { background: 'linear-gradient(90deg,#6C5CE7,#00BFA6)', color:'#fff', boxShadow:'0 6px 18px rgba(44, 62, 80, 0.12)' },
  btnGhost: { background:'#fff', color:'#6c6c6c', border:'1px solid #e0e0e0' },
  btnSmall: { padding:'6px 8px', fontSize:13, marginRight:6, background:'#0984e3', color:'#fff', borderRadius:5 },
  table: { width:'100%', borderCollapse:'collapse', marginTop:8, boxShadow:'0 6px 18px rgba(20,20,20,0.03)', borderRadius:8, overflow:'hidden' },
  th: { textAlign:'left', padding:'10px 12px', background:'#0d6efd', color:'#fff', fontWeight:600, fontSize:14 },
  td: { padding:'10px 12px', borderBottom:'1px solid #f0f0f0', verticalAlign:'middle' },
  trEven: { background: '#fff' },
  trOdd: { background: '#fafbff' },
  dayChip: { display:'inline-block', padding:'4px 8px', marginRight:6, background:'#ffeaa7', borderRadius:999, fontSize:12, color:'#2d3436' },
  badge: { display:'inline-block', padding:'4px 8px', borderRadius:999, background:'#55efc4', color:'#064e3b', fontWeight:600, fontSize:12 },
  input: { width:'100%', padding:'10px', borderRadius:8, border:'1px solid #e6e9ef', outline:'none', boxSizing:'border-box' },
  timeInput: { padding:'8px', borderRadius:8, border:'1px solid #e6e9ef', background:'#fff' },
  dropdown: { position:'absolute', left:0, right:0, background:'#fff', border:'1px solid #ddd', maxHeight:220, overflow:'auto', zIndex:30, boxShadow:'0 8px 30px rgba(11,12,30,0.08)' },
  dropdownItem: { padding:8, cursor:'pointer', borderBottom:'1px solid #f3f3f3' },
  dayLabel: { fontSize:13, color:'#2d2d2d' },
  centerCard: { display:'flex', alignItems:'center', justifyContent:'center', height:120 },
  spinner: { width:36, height:36, borderRadius:'50%', border:'4px solid #f0f0f0', borderTop:'4px solid #6C5CE7', animation:'spin 1s linear infinite' },
  error: { padding:12, background:'#ffe6e6', color:'#8a1f1f', borderRadius:8 }
}
