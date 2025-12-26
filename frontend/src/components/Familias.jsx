import React, { useEffect, useState, useMemo } from 'react'
import { apiFetch } from '../utils/api'
import Modal from './Modal'

export default function Familias({ selectedId = null, openCreate = false, prefillPacienteId = null, userRole }) {
  const [items, setItems] = useState(null)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState(null)
  const [expandedIds, setExpandedIds] = useState({})
  const [search, setSearch] = useState('')

  const shouldOpenCreate = useMemo(() => {
    if (typeof openCreate === 'string') {
      return /^(true|1)$/i.test(openCreate.trim())
    }
    return !!openCreate
  }, [openCreate])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        if (selectedId !== null && selectedId !== undefined) {
          const one = await apiFetch(`/api/familias/${selectedId}`)
          if (!mounted) return
          setItems([one])
        } else {
          const url = search ? `/api/familias?search=${encodeURIComponent(search)}` : '/api/familias'
          const res = await apiFetch(url)
          if (!mounted) return
          setItems(res)
        }
      } catch (e) { if (!mounted) return setError(e.message) }
    }
    load()
    return () => { mounted = false }
  }, [selectedId, search])

  useEffect(() => {
    if ((shouldOpenCreate || prefillPacienteId) && (selectedId === null || selectedId === undefined)) {
      const obj = {}
      if (prefillPacienteId) obj.__associatePacienteId = prefillPacienteId
      setEditing(obj)
    }
  }, [shouldOpenCreate, selectedId, prefillPacienteId])

  const labelMap = {
    ResponsablePrincipalNombre: 'Responsable principal - Nombre',
    responsablePrincipalNombre: 'Responsable principal - Nombre',
    responsable1Nombre: 'Responsable 1 - Nombre',
    ResponsablePrincipalApellido: 'Responsable principal - Apellido',
    responsablePrincipalApellido: 'Responsable principal - Apellido',
    responsable1Apellido: 'Responsable 1 - Apellido',
    ResponsablePrincipalDNI: 'Responsable principal - DNI',
    ResponsablePrincipalTelefono: 'Responsable principal - Teléfono',
    responsablePrincipalTelefono: 'Responsable principal - Teléfono',
    telefonoContacto: 'Teléfono de contacto',
    ResponsablePrincipalDireccion: 'Responsable principal - Dirección',
    ResponsablePrincipalEmail: 'Responsable principal - Email',
    responsable1Email: 'Responsable 1 - Email',
    pacientes: 'Pacientes',
    Pacientes: 'Pacientes',
    responsable2Nombre: 'Nombres (Responsable 2)',
    Responsable2Nombre: 'Nombres (Responsable 2)',
    responsable2Apellido: 'Apellidos (Responsable 2)',
    Responsable2Apellido: 'Apellidos (Responsable 2)',
    responsable2Relacion: 'Relacion (Responsable 2)',
    Responsable2Relacion: 'Relacion (Responsable 2)',
    responsable2Telefono: 'Telefono (Responsable 2)',
    Responsable2Telefono: 'Telefono (Responsable 2)',
    responsable2Direccion: 'Direccion (Responsable 2)',
    Responsable2Direccion: 'Direccion (Responsable 2)',
    responsable2DNI: 'DNI (Responsable 2)',
    Responsable2DNI: 'DNI (Responsable 2)',
    id: 'ID',
    Id: 'ID',
    createdAt: 'Creado en',
    updatedAt: 'Actualizado en'
  }

  function humanizeKey(k) {
    if (labelMap[k]) return labelMap[k]
    return String(k).replace(/([A-Z])/g, ' $1').replace(/[_\-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^./, s => s.toUpperCase())
  }

  function getIdKey(f) {
    return String(f.id ?? f.Id ?? JSON.stringify(f))
  }

  function getExtraKeys(f) {
    return Object.keys(f).filter(k => {
      const lk = String(k).toLowerCase()
      const lkNormalized = lk.replace(/[_\s]/g, '')
      if (lkNormalized.includes('createdat') || lkNormalized.includes('updatedat') || lkNormalized.includes('created') || lkNormalized.includes('updated')) return false
      if (lk.includes('fecha') && (lk.includes('cre') || lk.includes('actualiz') || lk.includes('creacion') || lk.includes('actualizacion') || lk.includes('creado') || lk.includes('actualizado'))) return false
      return ![
        'ResponsablePrincipalNombre', 'responsablePrincipalNombre', 'responsable1Nombre', 'ResponsablePrincipalApellido', 'responsablePrincipalApellido', 'responsable1Apellido',
        'ResponsableNombre', 'responsableNombre', 'Responsable', 'nombre', 'name',
        'ResponsablePrincipalTelefono', 'responsablePrincipalTelefono', 'responsable1Telefono', 'telefonoContacto', 'ResponsableTelefono', 'responsableTelefono', 'Telefono',
        'ResponsablePrincipalDireccion', 'responsablePrincipalDireccion', 'responsable1Direccion', 'Direccion', 'direccion',
        'ResponsablePrincipalEmail', 'responsablePrincipalEmail', 'responsable1Email', 'email',
        'ResponsablePrincipalDNI', 'ResponsablePrincipalDni', 'responsablePrincipalDNI', 'responsablePrincipalDni',
        'responsable1DNI', 'responsable1Dni', 'Responsable1DNI', 'Responsable1Dni',
        'ResponsablePrincipalRelacion', 'responsablePrincipalRelacion', 'responsable1Relacion', 'Relacion',
        'pacientes', 'Pacientes', 'id', 'Id'
      ].includes(k)
    }).sort()
  }

  async function refresh() {
    const url = search ? `/api/familias?search=${encodeURIComponent(search)}` : '/api/familias'
    const res = await apiFetch(url)
    setItems(res)
  }

  async function handleDelete(it) {
  const id = it.id ?? it.Id
  if (!id) return alert('ID no disponible')
  if (!confirm('Eliminar familia?')) return
  try {
    await apiFetch(`/api/familias/${id}`, { method: 'DELETE' })
    await refresh()
  } catch (e) {
    alert('Error: ' + (e.message || e))
  }
}

  async function handleSave(obj) {
    try {
      const payload = { ...obj }
      const id = payload.Id ?? payload.id
      let created = null
      if (id) {
        await apiFetch(`/api/familias/${id}`, { method: 'PUT', body: payload })
      } else {
        created = await apiFetch('/api/familias', { method: 'POST', body: payload })
      }
      await refresh()

      const associatePatientId = obj.__associatePacienteId || obj.__associatePacienteId === 0 ? obj.__associatePacienteId : null
      const newFamilyId = (created && (created.id ?? created.Id)) || id
      if (associatePatientId && newFamilyId) {
        try {
          // Obtener el rol actual
          function getUserRole() {
            const role = localStorage.getItem('userRole');
            if (role) return role;
            try {
              const token = localStorage.getItem('ct_token') || localStorage.getItem('token');
              if (!token) return '';
              const payload = JSON.parse(atob(token.split('.')[1]));
              const roleUrl = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
              const roleUrlAlt = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role";
              return payload?.role || payload?.Role || payload?.[roleUrl] || payload?.[roleUrlAlt] || '';
            } catch {
              return '';
            }
          }
          const userRole = getUserRole();
          const isPadre = userRole && userRole.toLowerCase() === 'padre';
          const pacienteActual = await apiFetch(`/api/pacientes/${associatePatientId}`)
          const endpoint = isPadre ? `/api/pacientes/mis-hijos/${associatePatientId}` : `/api/pacientes/${associatePatientId}`;
          await apiFetch(endpoint, {
            method: 'PUT',
            body: { ...pacienteActual, FamiliaId: newFamilyId }
          })
          await refresh()
          window.dispatchEvent(new CustomEvent('refresh:pacientes'))
        } catch (err) {
          console.warn('No se pudo asociar familia al paciente automáticamente:', err)
        }
      }

      setEditing(null)
    } catch (e) { alert('Error: ' + (e.message || e)) }
  }

  if (error) return <div className="error">Error: {error}</div>
  if (!items) return <div className="card"><div className="spinner" /></div>

 const userEmail = localStorage.getItem('userEmail');
let filteredItems = items;
if (userRole && userRole.toLowerCase() === 'padre' && userEmail) {
  filteredItems = items.filter(f =>
    (f.ResponsablePrincipalEmail ?? f.responsablePrincipalEmail ?? f.responsable1Email ?? f.email ?? '').trim().toLowerCase() === userEmail.trim().toLowerCase()
  );
}

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Familias</h2>
        {(userRole === 'Admin') && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              type="text"
              className="input"
              placeholder="Buscar por nombre, apellido o DNI..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 380 }}
            />
            <button className="btn" onClick={() => setEditing({})}>Nueva Familia</button>
          </div>
        )}
      </div>

      <div className="list" style={{ marginTop: 12, display: 'grid', gap: 12 }}>
        {filteredItems.map(f => {
          const idKey = getIdKey(f)
          const extras = getExtraKeys(f)
          const isExpanded = !!expandedIds[idKey]

          const pacientesArr = Array.isArray(f.pacientes) ? f.pacientes : (Array.isArray(f.Pacientes) ? f.Pacientes : [])
          const pacientesStr = pacientesArr.length
            ? pacientesArr
              .map(p => (`${p.nombres ?? p.Nombres ?? ''} ${p.apellidos ?? p.Apellidos ?? ''}`).trim())
              .filter(Boolean)
              .join(', ')
            : '—'

          return (
            <div className="card pastel" key={idKey}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0 }}>{(f.ResponsablePrincipalNombre ?? f.responsablePrincipalNombre ?? f.responsable1Nombre) ? `${f.ResponsablePrincipalNombre ?? f.responsablePrincipalNombre ?? f.responsable1Nombre} ${f.ResponsablePrincipalApellido ?? f.responsablePrincipalApellido ?? f.responsable1Apellido ?? ''}`.trim() : (f.ResponsableNombre ?? f.responsableNombre ?? f.nombre ?? f.name ?? `Familia ${f.id ?? f.Id}`)}</h3>

                  <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                    <div><strong>Teléfono:</strong> {f.ResponsablePrincipalTelefono ?? f.responsablePrincipalTelefono ?? f.responsable1Telefono ?? f.telefonoContacto ?? '—'}</div>
                    <div><strong>Dirección:</strong> {f.ResponsablePrincipalDireccion ?? f.responsablePrincipalDireccion ?? f.responsable1Direccion ?? f.Direccion ?? f.direccion ?? '—'}</div>
                    <div><strong>Email:</strong> {f.ResponsablePrincipalEmail ?? f.responsablePrincipalEmail ?? f.responsable1Email ?? f.email ?? '—'}</div>
                    <div><strong>DNI:</strong> {f.ResponsablePrincipalDNI ?? f.ResponsablePrincipalDni ?? f.responsablePrincipalDNI ?? f.responsablePrincipalDni ?? f.responsable1DNI ?? f.responsable1Dni ?? f.Responsable1DNI ?? f.responsable2DNI ?? f.responsable2Dni ?? f.Responsable2DNI ?? f.DNI ?? f.Dni ?? f.dni ?? '—'}</div>
                    <div><strong>Relación:</strong> {f.ResponsablePrincipalRelacion ?? f.responsablePrincipalRelacion ?? f.responsable1Relacion ?? f.Relacion ?? '—'}</div>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <strong>Pacientes:</strong> <span>{pacientesStr}</span>
                  </div>

                  {!isExpanded ? (
                    <div style={{ marginTop: 10 }}>
                      <em>Otros campos: {extras.length} — <button className="btn small" onClick={() => setExpandedIds(s => ({ ...s, [idKey]: true }))}>Ver más</button></em>
                    </div>
                  ) : (
                    <div style={{ marginTop: 10 }}>
                      <strong>Otros campos:</strong>
                      <div style={{ marginTop: 6 }}>
                        {(() => {
                          const responsable2Order = [
                            'responsable2Nombre', 'Responsable2Nombre', 'responsable2nombre',
                            'responsable2Apellido', 'Responsable2Apellido', 'responsable2apellido',
                            'responsable2DNI', 'responsable2Dni', 'Responsable2DNI', 'Responsable2Dni',
                            'responsable2Relacion', 'Responsable2Relacion', 'responsable2relacion',
                            'responsable2Telefono', 'Responsable2Telefono', 'responsable2telefono',
                            'responsable2Direccion', 'Responsable2Direccion', 'responsable2direccion'
                          ]
                          const special = []
                          for (const k of responsable2Order) if (extras.includes(k) && !special.includes(k)) special.push(k)
                          const others = extras.filter(k => !special.includes(k))
                          const displayKeys = [...special, ...others]
                          return displayKeys.map(key => {
                            const val = f[key]
                            return (
                              <div key={key} style={{ marginBottom: 6 }}>
                                <strong style={{ display: 'block' }}>{humanizeKey(key)}:</strong>
                                {val && typeof val === 'object' ? (
                                  <pre style={{ whiteSpace: 'pre-wrap', background: '#f7f7f7', padding: 8, borderRadius: 4 }}>{JSON.stringify(val, null, 2)}</pre>
                                ) : (
                                  <div>{val ?? '—'}</div>
                                )}
                              </div>
                            )
                          })
                        })()}
                        <div style={{ marginTop: 8 }}><button className="btn small ghost" onClick={() => setExpandedIds(s => ({ ...s, [idKey]: false }))}>Ver menos</button></div>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Ocultar botón Editar y Añadir Paciente para rol padre y terapeuta */}
                  {userRole && userRole.toLowerCase() !== 'padre' && userRole.toLowerCase() !== 'terapeuta' && (
                    <>
                      <button className="btn small" onClick={() => setEditing(f)}>Editar</button>
                      <button className="btn small" onClick={() => window.dispatchEvent(new CustomEvent('navigate:paciente', { detail: { familiaId: f.id ?? f.Id } }))}>Añadir Paciente</button>
                    </>
                  )}
                  {userRole === 'Admin' && (
                    <button className="btn small" onClick={() => handleDelete(f)} style={{ background: '#dc3545', color: 'white', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(220,53,69,0.3)' }}>Eliminar</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {editing && (
        <Modal title={`Familia ${(editing.Id || editing.id) || ''}`} onClose={() => setEditing(null)}>
          <form onSubmit={e => {
            e.preventDefault();
            const email = editing.ResponsablePrincipalEmail ?? editing.responsablePrincipalEmail ?? editing.responsable1Email ?? editing.email
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              return alert('Responsable principal: email requerido y con formato válido')
            }
            handleSave(editing)
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12, alignItems: 'start' }}>
              <h4 style={{ margin: '6px 0 0 0', gridColumn: '1 / -1' }}>Responsable principal</h4>
              <input className="input" placeholder="Nombre" value={editing.ResponsablePrincipalNombre ?? editing.responsablePrincipalNombre ?? editing.responsable1Nombre ?? ''} onChange={e => setEditing(s => ({ ...s, ResponsablePrincipalNombre: e.target.value }))} />
              <input className="input" placeholder="Apellido" value={editing.ResponsablePrincipalApellido ?? editing.responsablePrincipalApellido ?? editing.responsable1Apellido ?? ''} onChange={e => setEditing(s => ({ ...s, ResponsablePrincipalApellido: e.target.value }))} />
              <input className="input" placeholder="DNI" value={editing.ResponsablePrincipalDNI ?? editing.ResponsablePrincipalDni ?? editing.responsablePrincipalDNI ?? editing.responsablePrincipalDni ?? editing.responsable1DNI ?? editing.responsable1Dni ?? editing.DNI ?? editing.dni ?? ''} onChange={e => setEditing(s => ({ ...s, ResponsablePrincipalDNI: e.target.value }))} />
              <input className="input" placeholder="Teléfono" value={editing.ResponsablePrincipalTelefono ?? editing.responsablePrincipalTelefono ?? editing.responsable1Telefono ?? ''} onChange={e => setEditing(s => ({ ...s, ResponsablePrincipalTelefono: e.target.value }))} />
              <input className="input" placeholder="Dirección" value={editing.ResponsablePrincipalDireccion ?? editing.responsablePrincipalDireccion ?? editing.responsable1Direccion ?? editing.Direccion ?? editing.direccion ?? ''} onChange={e => setEditing(s => ({ ...s, ResponsablePrincipalDireccion: e.target.value }))} />
              <input className="input" placeholder="Email" value={editing.ResponsablePrincipalEmail ?? editing.responsablePrincipalEmail ?? editing.responsable1Email ?? editing.email ?? ''} onChange={e => setEditing(s => ({ ...s, ResponsablePrincipalEmail: e.target.value }))} />
              <input className="input" placeholder="Relación" value={editing.ResponsablePrincipalRelacion ?? editing.responsablePrincipalRelacion ?? editing.responsable1Relacion ?? ''} onChange={e => setEditing(s => ({ ...s, ResponsablePrincipalRelacion: e.target.value }))} />

              <h4 style={{ margin: '6px 0 0 0', gridColumn: '1 / -1' }}>Responsable 2</h4>
              <input className="input" placeholder="Nombres (Responsable 2)" value={editing.Responsable2Nombre ?? editing.responsable2Nombre ?? editing.responsable2nombre ?? ''} onChange={e => setEditing(s => ({ ...s, Responsable2Nombre: e.target.value }))} />
              <input className="input" placeholder="Apellidos (Responsable 2)" value={editing.Responsable2Apellido ?? editing.responsable2Apellido ?? editing.responsable2apellido ?? ''} onChange={e => setEditing(s => ({ ...s, Responsable2Apellido: e.target.value }))} />
              <input className="input" placeholder="DNI (Responsable 2)" value={editing.Responsable2DNI ?? editing.responsable2Dni ?? editing.responsable2DNI ?? ''} onChange={e => setEditing(s => ({ ...s, Responsable2DNI: e.target.value }))} />
              <input className="input" placeholder="Relación (Responsable 2)" value={editing.Responsable2Relacion ?? editing.responsable2Relacion ?? editing.responsable2relacion ?? ''} onChange={e => setEditing(s => ({ ...s, Responsable2Relacion: e.target.value }))} />
              <input className="input" placeholder="Teléfono (Responsable 2)" value={editing.Responsable2Telefono ?? editing.responsable2Telefono ?? editing.responsable2telefono ?? ''} onChange={e => setEditing(s => ({ ...s, Responsable2Telefono: e.target.value }))} />
              <input className="input" placeholder="Dirección (Responsable 2)" value={editing.Responsable2Direccion ?? editing.responsable2Direccion ?? editing.responsable2direccion ?? ''} onChange={e => setEditing(s => ({ ...s, Responsable2Direccion: e.target.value }))} />

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn" type="submit">Guardar</button>
                <button type="button" className="btn ghost" onClick={() => setEditing(null)}>Cancelar</button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </section>
  )
}
