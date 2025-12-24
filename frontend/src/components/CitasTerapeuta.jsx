import React, { useEffect, useState } from 'react';

// Suponiendo que tienes el id del terapeuta logueado en el contexto o auth
const TERAPEUTA_ID = 1; // Reemplaza esto por el id real del terapeuta logueado

function CitasTerapeuta() {
  const [citas, setCitas] = useState([]);
  const [nota, setNota] = useState('');
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);

  // 1. Traer las citas del terapeuta al montar el componente
  useEffect(() => {
    fetch(`/api/citas?terapeutaId=${TERAPEUTA_ID}`)
      .then(res => res.json())
      .then(data => setCitas(data));
  }, []);

  // 2. Completar cita (abrir modal)
  const handleCompletar = (cita) => {
    setCitaSeleccionada(cita);
    setNota('');
  };

  // 3. Guardar nota y marcar como completada
  const handleGuardarNota = async () => {
    // 3.1 Guardar nota de sesión
    await fetch('/api/notassesion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        citaId: citaSeleccionada.id,
        terapeutaId: TERAPEUTA_ID,
        notas: nota
      })
    });
    // 3.2 Cambiar estado de la cita a Completada
    await fetch(`/api/citas/${citaSeleccionada.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estado: 'Completada',
        notas: nota
      })
    });
    setNota('');
    setCitaSeleccionada(null);
    // Refrescar citas
    fetch(`/api/citas?terapeutaId=${TERAPEUTA_ID}`)
      .then(res => res.json())
      .then(data => setCitas(data));
  };

  // 4. Marcar como No asistió
  const handleNoAsistio = async (cita) => {
    await fetch(`/api/citas/${cita.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estado: 'NoAsistio'
      })
    });
    fetch(`/api/citas?terapeutaId=${TERAPEUTA_ID}`)
      .then(res => res.json())
      .then(data => setCitas(data));
  };

  return (
    <div>
      <h2>Mis Citas</h2>
      {citas.map(cita => (
        <div key={cita.id} className="cita-card">
          <div>Paciente: {cita.pacienteNombre}</div>
          <div>Fecha: {cita.fecha}</div>
          <div>Estado: {cita.estado}</div>
          <button onClick={() => handleCompletar(cita)} disabled={cita.estado !== 'Programada' && cita.estado !== 'Scheduled'}>Completar</button>
          <button onClick={() => handleNoAsistio(cita)} disabled={cita.estado !== 'Programada' && cita.estado !== 'Scheduled'}>No asistió</button>
        </div>
      ))}
      {/* Modal para nota */}
      {citaSeleccionada && (
        <div className="modal">
          <h3>Nota de sesión para {citaSeleccionada.pacienteNombre}</h3>
          <textarea value={nota} onChange={e => setNota(e.target.value)} />
          <button onClick={handleGuardarNota}>Guardar y completar</button>
          <button onClick={() => setCitaSeleccionada(null)}>Cancelar</button>
        </div>
      )}
    </div>
  );
}

export default CitasTerapeuta;
