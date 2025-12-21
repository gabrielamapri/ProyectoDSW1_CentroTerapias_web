@echo off
REM Script to create branch front3, commit changes and push to GitHub (Windows cmd)
REM Run from repository root: c:\Users\gabri\ProyectoFinalDSW_WEB























ENDLOCAL
necho Hecho.git push -u origin front3
necho Empujando rama 'front3' a origin (se solicitarán credenciales si corresponde)...git checkout -B front3
necho Creando o reemplazando rama local 'front3'...git fetch origin
necho Obteniendo referencias remotas...git remote add origin https://github.com/gabrielamapri/ProyectoFinalDSW_web.gitgit remote remove origin 2>nul
necho Configurando remote 'origin' -> https://github.com/gabrielamapri/ProyectoFinalDSW_web.gitgit commit -m "Frontend: fixes - familias/pacientes UX and backend contract" || echo No hay cambios para commitear.echo Haciendo commit (si no hay cambios, el commit no se hará)...git add -A
necho Agregando cambios...)  echo Repositorio git detectado.) else (  git init  echo Inicializando repositorio git...
nif not exist .git (nSETLOCAL ENABLEDELAYEDEXPANSION