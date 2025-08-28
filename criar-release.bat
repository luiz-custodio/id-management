@echo off
title Criar Release ID Management
color 0E

echo.
echo ========================================
echo   CRIAR RELEASE ID MANAGEMENT
echo ========================================
echo.

REM Verificar se está no git
if not exist ".git\" (
    echo ❌ Este nao e um repositorio Git!
    echo.
    echo Execute:
    echo git init
    echo git remote add origin https://github.com/SEU-USUARIO/id-management.git
    echo.
    pause
    exit /b 1
)

REM Verificar mudanças pendentes
git status --porcelain | findstr "^" >nul
if not errorlevel 1 (
    echo ⚠️  Voce tem mudancas nao commitadas!
    echo.
    git status
    echo.
    echo Deseja commitr agora? (s/n)
    set /p commit_now=
    if /i "%commit_now%"=="s" (
        echo.
        echo Digite a mensagem do commit:
        set /p commit_msg=
        git add .
        git commit -m "%commit_msg%"
    ) else (
        echo ❌ Cancedado. Commite as mudancas primeiro.
        pause
        exit /b 1
    )
)

echo.
echo Digite a versao do release (ex: v1.0.0):
set /p version=

REM Validar formato da versão
echo %version% | findstr "^v[0-9]\+\.[0-9]\+\.[0-9]\+$" >nul
if errorlevel 1 (
    echo ❌ Formato invalido! Use: v1.0.0
    pause
    exit /b 1
)

echo.
echo [1/3] 📋 Criando tag %version%...
git tag %version%
if errorlevel 1 (
    echo ❌ Erro ao criar tag!
    pause
    exit /b 1
)

echo [2/3] 🚀 Enviando para GitHub...
git push origin main
git push origin %version%
if errorlevel 1 (
    echo ❌ Erro ao enviar para GitHub!
    echo.
    echo Verifique:
    echo - Conexao com internet
    echo - Autenticacao Git configurada
    echo - Repositorio existe no GitHub
    pause
    exit /b 1
)

echo [3/3] ✅ Release criado!
echo.
echo ========================================
echo  🎉 RELEASE %version% CRIADO!
echo ========================================
echo.
echo  👀 Acompanhe o build em:
echo     https://github.com/SEU-USUARIO/id-management/actions
echo.
echo  📥 Download estara disponivel em:
echo     https://github.com/SEU-USUARIO/id-management/releases
echo.
echo  ⏱️  Tempo estimado: 5-10 minutos
echo.
echo ========================================
pause
