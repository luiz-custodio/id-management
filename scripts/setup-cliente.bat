@echo off
title Configurar Cliente - ID Management
color 0A
cls

echo ======================================
echo   Configurar Servidor do Aplicativo
echo ======================================
echo.

set /p SERVER_IP=Digite o IP do servidor (ex: 192.168.1.54): 
if "%SERVER_IP%"=="" (
  echo IP invalido.
  pause
  exit /b 1
)

set CFG_PATH=%USERPROFILE%\.id-management-config.json

>"%CFG_PATH%" echo { "host": "%SERVER_IP%", "port": 8000, "protocol": "http" }

echo.
echo Arquivo criado em: %CFG_PATH%
echo Conteudo:
type "%CFG_PATH%"

echo.
echo Pronto! Abra o ID Management System.exe novamente.
pause

