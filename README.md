# Frontend - Proyecto Final

Frontend mínimo con Vite + React.

## Requisitos previos

Asegúrate de tener instalado [Node.js](https://nodejs.org/) (recomendado v18+).


## Instalación y ejecución

**Importante:** Ejecuta los siguientes comandos en una consola Command Prompt (cmd), no en PowerShell ni Git Bash, para evitar posibles problemas con los scripts de npm en Windows.

```cmd
cd frontend
npm install
npm install react-day-picker

# Inicia la aplicación en modo desarrollo
npm run dev
```



## Configuración de la API

Por defecto, el frontend espera que el backend esté disponible en:

```
http://localhost:5192
```

Si el backend está en otro puerto o URL, crea (o edita) el archivo `.env` en la carpeta `frontend` y agrega o modifica la siguiente línea:

```
VITE_API_URL=http://localhost:[PUERTO]
```


## Dependencias principales

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [react-datepicker](https://reactdatepicker.com/) (ya incluida)

- [react-day-picker](https://react-day-picker.js.org/) (**debes instalarla si usas el calendario**)
- [date-fns](https://date-fns.org/)

Revisa el archivo `package.json` para ver todas las dependencias utilizadas.

---

## ¿De qué se trata este proyecto?

Este frontend es una aplicación web para la gestión de citas y pacientes de un centro de terpias infantiles. Permite:

- Registrar, listar y editar pacientes.
- Gestionar terapeutas y sus especialidades.
- Agendar, consultar y modificar citas.
- Visualizar reportes de historial de citas y pacientes.
- Administrar franjas horarias, excepciones y tipos de sesión.
- Acceso mediante autenticación.

Las interfaces principales incluyen:
- Panel de inicio con acceso rápido a módulos.
- Listados y formularios para pacientes, terapeutas, familias y citas.
- Reportes descargables o visualizables en pantalla.
- Calendarios interactivos para selección de fechas.

El objetivo es facilitar la administración integral de la agenda y la información de pacientes y profesionales de la salud.
