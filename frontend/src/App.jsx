import React, { useState } from 'react'
import Pacientes from './components/Pacientes'
import Terapeutas from './components/Terapeutas'
import Citas from './components/Citas'
import Auth from './components/Auth'
import Especialidades from './components/Especialidades'
import TipoSesiones from './components/TipoSesiones'
import Franjas from './components/Franjas'
import NotasSesion from './components/NotasSesion'
import ReportHistorialPaciente from './components/ReportHistorialPaciente'
import ReportHistorialCitas from './components/ReportHistorialCitas'
import FranjaExcepciones from './components/FranjaExcepciones'

import ReportCitasProximas from './components/ReportCitasProximas'
import Familias from './components/Familias'
import './styles.css'

export default function App() {
  const [view, setView] = useState('auth')
  const [token, setToken] = useState(localStorage.getItem('ct_token'))
  const [selectedFamilyId, setSelectedFamilyId] = useState(null)
  const [selectedFamilyOpenCreate, setSelectedFamilyOpenCreate] = useState(false)
  const [selectedFamilyPatientId, setSelectedFamilyPatientId] = useState(null)

  function handleLogin(t) {
    setToken(t)
    setView('home')
  }

  function handleLogout() {
    localStorage.removeItem('ct_token')
    setToken(null)
  }

  // Helper para navegar a familias y resetear estados
  function navigateToFamilias() {
    setSelectedFamilyId(null)
    setSelectedFamilyOpenCreate(false)
    setSelectedFamilyPatientId(null)
    setView('familias')
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
      setSelectedFamilyPatientId(d.patientId ?? null)
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
    
    return () => {
      window.removeEventListener('navigate:familia', onNavigateFamilia)
      window.removeEventListener('navigate:paciente', onNavigatePaciente)
    }
  }, [])

  return (
    <div className="app-container">
      <header className="site-header">
        <div className="brand">
          <img src="/logo-cerebro-feliz.svg" alt="Logo NeuroCrecer" className="logo" />
          <div>
            <div className="title">NeuroCrecer</div>
            <div className="subtitle">Centro Especializado en Terapias Infantiles</div>
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
              <button className={view==='familias'? 'active':''} onClick={navigateToFamilias}>Familias</button>
              <button className={view==='pacientes'? 'active':''} onClick={() => setView('pacientes')}>Pacientes</button>
              <button className={view==='especialidades'? 'active':''} onClick={() => setView('especialidades')}>Especialidades</button>
              <button className={view==='terapeutas'? 'active':''} onClick={() => setView('terapeutas')}>Terapeutas</button>
              <button className={view==='franjas'? 'active':''} onClick={() => setView('franjas')}>Franjas</button>
              <button className={view==='franjaexcepciones'? 'active':''} onClick={() => setView('franjaexcepciones')}>Franja Excepciones</button>
              <button className={view==='tiposesiones'? 'active':''} onClick={() => setView('tiposesiones')}>Tipo de Sesión</button>
              <button className={view==='citas'? 'active':''} onClick={() => setView('citas')}>Citas</button>
              <button className={view==='notas'? 'active':''} onClick={() => setView('notas')}>Notas Sesión</button>
              <button className={view==='report-historial'? 'active':''} onClick={() => setView('report-historial')}>Reporte: Historial de Paciente</button>
              <button className={view==='report-historial-citas'? 'active':''} onClick={() => setView('report-historial-citas')}>Reporte: Historial de Citas</button>
              
              
              <button className={view==='report-citas-proximas'? 'active':''} onClick={() => setView('report-citas-proximas')}>Reporte: Citas Próximas</button>
              
              <button className="logout" onClick={() => { handleLogout(); setView('auth'); }}>Cerrar sesión</button>
            </nav>
          </aside>
        )}

        <div className="content">

      {view === 'home' && (
        <>
          <section className="hero card hero-pastel">
            <h2 style={{margin:'0 0 8px 0'}}>Bienvenido al Centro Especializado en Terapias Infantiles</h2>
            <p className="muted">Plataforma administrativa para gestionar pacientes, terapeutas y citas.</p>
          </section>

          <div className="home-cards" style={{marginTop:12}}>
            <div className="card home-card pastel" onClick={() => setView('pacientes')}>
              <div className="icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 20c0-2.21 3.58-4 6-4s6 1.79 6 4" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h3 style={{margin:'0 0 6px 0'}}>Pacientes</h3>
              <small className="muted">Gestionar personas atendidas</small>
            </div>

            <div className="card home-card pastel" onClick={navigateToFamilias}>
              <div className="icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3z" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 20c0-2.21 3.58-4 6-4s6 1.79 6 4" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h3 style={{margin:'0 0 6px 0'}}>Familias</h3>
              <small className="muted">Grupos y contactos familiares</small>
            </div>

            <div className="card home-card pastel" onClick={() => setView('terapeutas')}>
              <div className="icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v6" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 12h12" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 20h16v-4H4v4z" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h3 style={{margin:'0 0 6px 0'}}>Terapeutas</h3>
              <small className="muted">Equipo terapéutico y especialidades</small>
            </div>

            <div className="card home-card pastel" onClick={() => setView('citas')}>
              <div className="icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#374151" strokeWidth="1.2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h3 style={{margin:'0 0 6px 0'}}>Citas</h3>
              <small className="muted">Programar y ver citas</small>
            </div>

            <div className="card home-card pastel" onClick={() => setView('franjas')}>
              <div className="icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 7v5l3 3" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9" stroke="#374151" strokeWidth="1.2"/></svg>
              </div>
              <h3 style={{margin:'0 0 6px 0'}}>Franjas</h3>
              <small className="muted">Disponibilidad de terapeutas</small>
            </div>

            <div className="card home-card pastel" onClick={() => setView('especialidades')}>
              <div className="icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l2.09 6.26L20 9l-5 3.64L16.18 20 12 16.9 7.82 20 9 12.64 4 9l5.91-.74L12 2z" stroke="#374151" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h3 style={{margin:'0 0 6px 0'}}>Especialidades</h3>
              <small className="muted">Tipos de atención</small>
            </div>

            <div className="card home-card pastel" onClick={() => setView('tiposesiones')}>
              <div className="icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 8v5l3 3" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="3" width="18" height="18" rx="2" stroke="#374151" strokeWidth="1.2"/></svg>
              </div>
              <h3 style={{margin:'0 0 6px 0'}}>Tipo de Sesión</h3>
              <small className="muted">Duración y precios</small>
            </div>

            <div className="card home-card pastel" onClick={() => setView('notas')}>
              <div className="icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 15V6a2 2 0 0 0-2-2H7" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 9v11a2 2 0 0 0 2 2h14" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h3 style={{margin:'0 0 6px 0'}}>Notas Sesión</h3>
              <small className="muted">Apuntes clínicos por cita</small>
            </div>
            {/* Tarjeta para Franja Excepciones */}
            <div className="card home-card pastel" onClick={() => setView('franjaexcepciones')}>
              <div className="icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="16" height="16" rx="3" stroke="#374151" strokeWidth="1.2"/><path d="M8 12h8" stroke="#374151" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </div>
              <h3 style={{margin:'0 0 6px 0'}}>Franja Excepciones</h3>
              <small className="muted">Excepciones de atención</small>
            </div>
            {/* Tarjeta para Reporte: Historial de Paciente */}
            <div className="card home-card pastel" onClick={() => setView('report-historial')}>
              <div className="icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#374151" strokeWidth="1.2"/><path d="M8 8h8M8 12h8M8 16h4" stroke="#374151" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </div>
              <h3 style={{margin:'0 0 6px 0'}}>Reporte: Historial de Paciente</h3>
              <small className="muted">Ver historial de un paciente</small>
            </div>
            {/* Tarjeta para Reporte: Historial de Citas */}
            <div className="card home-card pastel" onClick={() => setView('report-historial-citas')}>
              <div className="icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#374151" strokeWidth="1.2"/><path d="M7 8h10M7 12h10M7 16h6" stroke="#374151" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </div>
              <h3 style={{margin:'0 0 6px 0'}}>Reporte: Historial de Citas</h3>
              <small className="muted">Ver historial de citas</small>
            </div>
            {/* Tarjeta para Reporte: Citas Próximas */}
            <div className="card home-card pastel" onClick={() => setView('report-citas-proximas')}>
              <div className="icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#374151" strokeWidth="1.2"/><path d="M12 8v4l3 3" stroke="#374151" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </div>
              <h3 style={{margin:'0 0 6px 0'}}>Reporte: Citas Próximas</h3>
              <small className="muted">Ver próximas citas</small>
            </div>
          </div>
        </>
      )}

      <main style={{marginTop:12}}>
        {view === 'pacientes' && <Pacientes />}
        {view === 'terapeutas' && <Terapeutas />}
        {view === 'citas' && <Citas />}
        {view === 'especialidades' && <Especialidades />}
        {view === 'tiposesiones' && <TipoSesiones />}
        {view === 'franjas' && <Franjas />}
        {view === 'franjaexcepciones' && <FranjaExcepciones />}
        {view === 'notas' && <NotasSesion />}
        {view === 'report-historial' && <ReportHistorialPaciente />}
        {view === 'report-historial-citas' && <ReportHistorialCitas />}
        
        
        {view === 'report-citas-proximas' && <ReportCitasProximas />}
        {view === 'familias' && <Familias selectedId={selectedFamilyId} openCreate={selectedFamilyOpenCreate} prefillPacienteId={selectedFamilyPatientId} />}
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
