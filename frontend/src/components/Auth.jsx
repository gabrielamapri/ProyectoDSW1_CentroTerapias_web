import React, { useState } from 'react'
import { apiFetch, saveToken } from '../utils/api'

export default function Auth({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      })
      // Guardar email, role y token en localStorage según formato del backend
      if (data?.email) localStorage.setItem('userEmail', data.email)
      if (data?.role) localStorage.setItem('userRole', data.role)
      if (data?.token) localStorage.setItem('ct_token', data.token)
      saveToken(data?.token)
      setToken(data?.token)
      if (onLogin) onLogin({ token: data?.token, role: data?.role, email: data?.email })
    } catch (err) {
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  // token UI is hidden in the login view; frontend stores token after successful login

  return (
    <div className="auth-center">
      <div className="auth-bg" aria-hidden>
        <div className="bubble b1"></div>
        <div className="bubble b2"></div>
        <div className="bubble b3"></div>
        <div className="bubble b4"></div>
        <div className="bubble b5"></div>
        <div className="bubble b6"></div>
        <div className="bubble b7"></div>
        <div className="bubble b8"></div>
        <div className="bubble b9"></div>
        <div className="bubble b10"></div>
          <div className="bubble b11"></div>
          <div className="bubble b12"></div>
          <div className="bubble b13"></div>
          <div className="bubble b14"></div>
          <div className="bubble b15"></div>
          <div className="bubble b16"></div>
      </div>
      <div className="auth-card">
        <div className="auth-hero">
          <img src="/logo-cerebro-feliz.svg" alt="Logo Centro Especializado en Terapias Infantiles" className="logo" />
          <div>
            <h2 style={{margin:0}}>NeuroCrecer</h2>
            <p style={{margin:0,color:'#64748b'}}>Centro Especializado en Terapias Infantiles</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{display:'grid',gap:10}}>
            <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
            <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
            <div className="auth-actions">
              <button className="btn" type="submit" disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</button>
            </div>
          </div>
        </form>

        {error && <div style={{color:'#dc2626',marginTop:10}}>{error}</div>}

        {token && (
          <div style={{marginTop:12}}>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <div style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{showFull ? token : (String(token).slice(0,24) + '...')}</div>
              <button className="btn small" onClick={handleCopy}>Copiar</button>
              <button className="btn small muted" onClick={()=>setShowFull(s=>!s)}>{showFull ? 'Ocultar' : 'Mostrar'}</button>
              <button className="btn small muted" onClick={handleLogout}>Cerrar sesión</button>
            </div>
            {showFull && (
              <pre style={{ whiteSpace: 'pre-wrap', marginTop:8, background:'#f3f4f6', padding:8, borderRadius:6 }}>{String(token)}</pre>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
