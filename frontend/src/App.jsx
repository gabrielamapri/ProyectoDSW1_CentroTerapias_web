import React, { useState } from 'react'
import Pacientes from './components/Pacientes'
import Terapeutas from './components/Terapeutas'
import Citas from './components/Citas'
import Auth from './components/Auth'
import Especialidades from './components/Especialidades'
import TipoSesiones from './components/TipoSesiones'
import Franjas from './components/Franjas'
import NotasSesion from './components/NotasSesion'
import Familias from './components/Familias'
import './styles.css'

export default function App() {
  const [view, setView] = useState('auth')
  const [token, setToken] = useState(localStorage.getItem('ct_token'))
  const [selectedFamilyId, setSelectedFamilyId] = useState(null)
  const [selectedFamilyOpenCreate, setSelectedFamilyOpenCreate] = useState(false)

  function handleLogin(t) {
    setToken(t)
    setView('home')
  }

  function handleLogout() {
    localStorage.removeItem('ct_token')
    setToken(null)
  }

  React.useEffect(() => {
    function onUnauthorized() {
      handleLogout()
      setView('auth')
      try { alert('Sesión expirada o no autorizada. Por favor inicia sesión.') } catch {}
    }
    window.addEventListener('auth:unauthorized', onUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized)
  }, [])

  React.useEffect(()=>{
    function onNavigateFamilia(e){
      const d = e.detail || {}
      setSelectedFamilyId(d.id ?? null)
      setSelectedFamilyOpenCreate(!!d.openCreate)
      setView('familias')
    }
    window.addEventListener('navigate:familia', onNavigateFamilia)
    function onNavigatePaciente(e){
      const d = e.detail || {}
      setView('pacientes')
      try {
        // dispatch the open event slightly later so the Pacientes component
        // has time to mount and register its listener
        setTimeout(() => {
          try { window.dispatchEvent(new CustomEvent('open:create:paciente', { detail: d })) } catch {}
        }, 50)
      } catch {}
    }
    window.addEventListener('navigate:paciente', onNavigatePaciente)
    return () => window.removeEventListener('navigate:familia', onNavigateFamilia)
  }, [])

  return (
    <div className="app-container">
      <header className="site-header">
        <div className="brand">
          <img src="/logo-cerebro-feliz.svg" alt="Logo NeuroCrecer" className="logo" />
          <div>
            <div className="title">NeuroCrecer</div>
            <div className="subtitle">Centro de Sesiones</div>
          </div>
        </div>

        <div className="header-right">
          <div className="schedule" title="Horario de atención">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight:6}}>
              <path d="M12 7V12L15 14" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="8" stroke="#374151" strokeWidth="1.2"/>
            </svg>
            <div className="schedule-text"><strong>Horario</strong><span>07:00 — 20:00</span></div>
          </div>

          <a className="whatsapp" href="https://wa.me/51959220198" target="_blank" rel="noopener noreferrer" title="Contactar por WhatsApp">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12.08c0-4.97-4.03-9-9-9S3 7.11 3 12.08c0 1.61.42 3.12 1.17 4.44L3 21l4.76-1.24A8.91 8.91 0 0012 21c4.97 0 9-4.03 9-8.92z" fill="#25D366" opacity="0.12"/>
              <path d="M20.5 3.5a11 11 0 10-3.05 15.83L21 21l1.67-4.02A11 11 0 0020.5 3.5z" stroke="#25D366" strokeWidth="0" fill="none"/>
              <path d="M16.7 13.3c-.3-.15-1.75-.86-2.03-.97-.28-.11-.48-.16-.68.16-.2.32-.78.97-.96 1.17-.18.2-.36.22-.66.07-.3-.15-1.26-.47-2.4-1.47-.89-.8-1.48-1.8-1.66-2.1-.18-.3-.02-.46.13-.61.13-.12.3-.33.45-.5.15-.16.2-.27.3-.45.1-.18.05-.34-.03-.49-.08-.15-.68-1.63-.93-2.24-.24-.58-.48-.5-.66-.51-.17-.01-.37-.01-.57-.01-.2 0-.5.07-.76.34-.26.27-1 1-.99 2.47 0 1.47 1.03 2.9 1.17 3.1.14.2 2.02 3.2 4.9 4.48 2.88 1.28 2.88.85 3.4.8.52-.05 1.74-.71 1.99-1.4.25-.7.25-1.3.17-1.42-.08-.12-.28-.18-.58-.33z" fill="#075E54"/>
            </svg>
            <span className="whatsapp-text">WhatsApp</span>
          </a>
        </div>
      </header>

      <div className="layout">
        {token && view !== 'auth' && (
          <aside className="sidebar">
            <nav className="nav-vertical">
              <button className={view==='home'? 'active':''} onClick={() => setView('home')}>Inicio</button>
              <button className={view==='familias'? 'active':''} onClick={() => setView('familias')}>Familias</button>
              <button className={view==='pacientes'? 'active':''} onClick={() => setView('pacientes')}>Pacientes</button>
              <button className={view==='terapeutas'? 'active':''} onClick={() => setView('terapeutas')}>Terapeutas</button>
              <button className={view==='tiposesiones'? 'active':''} onClick={() => setView('tiposesiones')}>Tipo de Sesión</button>
              <button className={view==='citas'? 'active':''} onClick={() => setView('citas')}>Citas</button>
              <button className={view==='especialidades'? 'active':''} onClick={() => setView('especialidades')}>Especialidades</button>
              <button className={view==='franjas'? 'active':''} onClick={() => setView('franjas')}>Franjas</button>
              <button className={view==='notas'? 'active':''} onClick={() => setView('notas')}>Notas Sesión</button>
              
              <button className="logout" onClick={() => { handleLogout(); setView('auth'); }}>Cerrar sesión</button>
            </nav>
          </aside>
        )}

        <div className="content">

      {view === 'home' && (
        <section className="hero card">
          <h2 style={{margin:'0 0 8px 0'}}>Bienvenido al Centro de Sesiones</h2>
          <p className="muted">Plataforma administrativa para gestionar pacientes, terapeutas y citas. Usa el menú para navegar o inicia sesión para acceder a funciones protegidas.</p>
        </section>
      )}

      <main style={{marginTop:12}}>
        {view === 'pacientes' && <Pacientes />}
        {view === 'terapeutas' && <Terapeutas />}
        {view === 'citas' && <Citas />}
        {view === 'especialidades' && <Especialidades />}
        {view === 'tiposesiones' && <TipoSesiones />}
        {view === 'franjas' && <Franjas />}
        {view === 'notas' && <NotasSesion />}
        {view === 'familias' && <Familias selectedId={selectedFamilyId} openCreate={selectedFamilyOpenCreate} />}
        {view === 'auth' && <Auth onLogin={handleLogin} />}
      </main>

        </div>
      </div>

      <div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',marginTop:14}}>
        <div style={{fontSize:13,color:'#374151'}}>
          {token && (
            <>
              <span style={{marginRight:8}}>Autenticado</span>
              <button className="btn ghost" onClick={handleLogout}>Cerrar sesión</button>
            </>
          )}
        </div>
      </div>

    </div>
  )
}
