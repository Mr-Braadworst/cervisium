@echo off
REM ==============================================================================
REM BierLog - 1-Commando GitHub & Docker Setup Script (Windows)
REM Gebruik:
REM   git clone <JOUW_GITHUB_REPO_URL> bierlog && cd bierlog && start.bat
REM ==============================================================================

echo [BierLog] Docker containers + eigen PostgreSQL database worden gebouwd en gestart...
docker compose up -d --build

if %ERRORLEVEL% EQU 0 (
  echo.
  echo ==================================================================
  echo [OK] BierLog + Eigen PostgreSQL Database draaien nu!
  echo Open in je browser: http://localhost:3000
  echo ==================================================================
) else (
  echo [FOUT] Controleer of Docker Desktop draait.
)
