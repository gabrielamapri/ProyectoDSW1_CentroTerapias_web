@echo off
REM Script to add, commit and push current repo to GitHub (Windows cmd)
REM Usage: run this from the repository root in a cmd.exe shell.

SETLOCAL ENABLEDELAYEDEXPANSION

if not exist .git (
  echo Inicializando repositorio git...
  git init
) else (
  echo Repositorio git detectado.
)













ENDLOCAL
necho Hecho.git push -u origin main
necho Empujando a origin/main (se solicitarán credenciales si corresponde)...git branch -M maingit remote add origin https://github.com/gabrielamapri/ProyectoFinalDSW_web.gitgit remote remove origin 2>nul
necho Configurando remote 'origin' -> https://github.com/gabrielamapri/ProyectoFinalDSW_web.gitgit commit -m "Frontend: fixes - familias/pacientes UX and backend contract" || echo No hay cambios para commitear.echo Haciendo commit (si no hay cambios, el commit fallará y el script seguirá)...git add -Anecho Agregando cambios...