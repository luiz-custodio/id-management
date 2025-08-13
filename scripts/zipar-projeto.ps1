<# 
Gera um ZIP "limpo" do projeto id-management, ignorando arquivos/pastas locais e travados.
Saída: ZIP com timestamp na Área de Trabalho do usuário.
#>

$ErrorActionPreference = 'Stop'

# --- Caminhos principais ---
# Ajuste se necessário; por padrão, considera que este .ps1 está dentro de ...\id-management\scripts
$ScriptRoot   = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot  = Resolve-Path (Join-Path $ScriptRoot '..')

# Nome do ZIP com data/hora (evita sobrescrever) - agora na raiz do projeto
$Stamp        = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$ZipName      = "id-management_$Stamp.zip"
$ZipPath      = Join-Path $ProjectRoot $ZipName

# Pasta temporária de staging
$StageDir     = Join-Path $env:TEMP ("idmg_stage_" + [guid]::NewGuid().ToString("N"))

# --- Dicas úteis no console ---
Write-Host "🚀 Iniciando empacotamento do projeto..." -ForegroundColor Green
Write-Host "Projeto:  $ProjectRoot" -ForegroundColor Cyan
Write-Host "Destino:  $ZipPath" -ForegroundColor Cyan
Write-Host "Staging:  $StageDir" -ForegroundColor Yellow
Write-Host ""

# --- Localiza robocopy (resolve problema do PATH) ---
$RoboCopyPaths = @(
    "$env:WINDIR\System32\robocopy.exe",
    "$env:WINDIR\Sysnative\robocopy.exe"
)

$RoboCopyExe = $RoboCopyPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $RoboCopyExe) {
    Write-Warning "⚠️ robocopy não encontrado no sistema. Usando Copy-Item como fallback..."
    $UseRoboCopy = $false
} else {
    Write-Host "✅ Robocopy encontrado: $RoboCopyExe" -ForegroundColor Green
    $UseRoboCopy = $true
}

# --- (Opcional) Checar processos que podem travar o DB ---
$ProcessesToCheck = @("uvicorn", "python", "fastapi")
$RunningProcesses = Get-Process -Name $ProcessesToCheck -ErrorAction SilentlyContinue

if ($RunningProcesses) {
    Write-Host "⚠️ Processos detectados que podem estar usando arquivos do projeto:" -ForegroundColor Yellow
    $RunningProcesses | ForEach-Object {
        Write-Host "  - $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Yellow
    }
    
    $response = Read-Host "Deseja finalizar estes processos? (s/N)"
    if ($response -eq 's' -or $response -eq 'S') {
        $RunningProcesses | ForEach-Object {
            Write-Host "🛑 Finalizando $($_.ProcessName)..." -ForegroundColor Red
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        }
    }
}

# --- Cria staging ---
Write-Host "📁 Criando diretório temporário..." -ForegroundColor Blue
New-Item -ItemType Directory -Path $StageDir | Out-Null

# --- Listas de exclusão ---
$ExcludeDirs = @(
    ".git",
    ".venv", 
    "venv",
    "env",
    "node_modules",
    "dist",
    "build",
    ".cache",
    ".pytest_cache",
    ".mypy_cache",
    "__pycache__",
    ".vscode",
    ".idea",
    ".vs",
    "frontend\node_modules",
    "frontend\dist",
    "frontend\build"
)

$ExcludeFiles = @(
    "backend\ids.db",
    "backend\*.db",
    "data\cadastro_filiais.xlsx",
    "*.zip",
    "*.log",
    "*.pyc",
    "*.pyo",
    ".env",
    ".env.local",
    "desktop.ini",
    "Thumbs.db",
    ".DS_Store"
)

if ($UseRoboCopy) {
    # --- Método 1: RoboCopy (mais eficiente) ---
    Write-Host "📋 Copiando arquivos com robocopy..." -ForegroundColor Blue
    
    # Constrói parâmetros /XD (diretórios excluídos)
    $XD = @()
    foreach ($d in $ExcludeDirs) {
        $XD += "/XD"
        $XD += $d
    }
    
    # Constrói parâmetros /XF (arquivos excluídos)
    $XF = @()
    foreach ($f in $ExcludeFiles) {
        $XF += "/XF"
        $XF += $f
    }

    # /E     -> inclui subdiretórios (inclusive vazios)
    # /R:1   -> tenta 1 vez em caso de erro
    # /W:1   -> espera 1s entre tentativas
    # /NFL /NDL /NJH /NJS /NP -> menos ruído no console
    $rcArgs = @(
        "`"$ProjectRoot`"",
        "`"$StageDir`"",
        "/E", "/R:1", "/W:1", "/NFL", "/NDL", "/NJH", "/NJS", "/NP"
    ) + $XD + $XF

    Write-Host "🔍 Comando robocopy:" -ForegroundColor Yellow
    Write-Host "& `"$RoboCopyExe`" $($rcArgs -join ' ')" -ForegroundColor Gray
    
    & $RoboCopyExe @rcArgs
    $ExitCode = $LASTEXITCODE
    
    Write-Host "ℹ️ Robocopy exit code: $ExitCode" -ForegroundColor Cyan
    
    # RoboCopy códigos de saída: 0-7 = sucesso, 8+ = erro
    # 0 = Nenhum arquivo copiado
    # 1 = Todos os arquivos copiados com sucesso
    # 2 = Alguns arquivos extras encontrados no destino
    # 4 = Alguns arquivos incompatíveis foram ignorados
    # 8 = Alguns arquivos/diretórios não puderam ser copiados (falha)
    # 16 = Erro fatal, nenhum arquivo copiado
    if ($ExitCode -ge 8) {
        Write-Warning "❌ Robocopy falhou com código $ExitCode. Tentando fallback..."
        $UseRoboCopy = $false
    } else {
        Write-Host "✅ Robocopy concluído com sucesso" -ForegroundColor Green
    }
}

# Executa Copy-Item se robocopy não funcionou
if (-not $UseRoboCopy) {
    # --- Método 2: Copy-Item (fallback) ---
    Write-Host "📋 Copiando arquivos com Copy-Item (pode ser mais lento)..." -ForegroundColor Blue
    
    # Função para verificar se um caminho deve ser excluído
    function Should-Exclude {
        param($Path, $RelativePath)
        
        # Verifica diretórios
        foreach ($dir in $ExcludeDirs) {
            if ($RelativePath -like "*\$dir\*" -or $RelativePath -eq $dir) {
                return $true
            }
        }
        
        # Verifica arquivos
        foreach ($file in $ExcludeFiles) {
            if ($RelativePath -like $file) {
                return $true
            }
        }
        
        return $false
    }
    
    # Copia recursivamente com exclusões
    Get-ChildItem -Path $ProjectRoot -Recurse | ForEach-Object {
        $relativePath = $_.FullName.Substring($ProjectRoot.Length + 1)
        
        if (-not (Should-Exclude $_.FullName $relativePath)) {
            $destPath = Join-Path $StageDir $relativePath
            
            if ($_.PSIsContainer) {
                # É um diretório
                if (-not (Test-Path $destPath)) {
                    New-Item -ItemType Directory -Path $destPath -Force | Out-Null
                }
            } else {
                # É um arquivo
                $destDir = Split-Path $destPath -Parent
                if (-not (Test-Path $destDir)) {
                    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
                }
                Copy-Item $_.FullName -Destination $destPath -Force
            }
        }
    }
}

# --- Verifica se staging tem conteúdo ---
$StageItems = Get-ChildItem -Path $StageDir -Recurse
if ($StageItems.Count -eq 0) {
    throw "❌ Nenhum arquivo foi copiado para o staging. Verifique as exclusões."
}

Write-Host "✅ $($StageItems.Count) itens copiados para staging" -ForegroundColor Green

# --- Compacta o staging para o ZIP ---
Write-Host "🗜️ Compactando para ZIP..." -ForegroundColor Blue

if (Test-Path $ZipPath) {
    # Caso exista um ZIP de mesmo nome (muito improvável por conta do timestamp)
    Write-Warning "⚠️ Arquivo ZIP já existe, substituindo..."
    Remove-Item $ZipPath -Force
}

try {
    Compress-Archive -Path (Join-Path $StageDir '*') -DestinationPath $ZipPath -Force
    
    # Verifica tamanho do ZIP gerado
    $ZipInfo = Get-Item $ZipPath
    $ZipSizeMB = [math]::Round($ZipInfo.Length / 1MB, 2)
    
    Write-Host "✅ ZIP criado com sucesso!" -ForegroundColor Green
    Write-Host "📦 Tamanho: $ZipSizeMB MB" -ForegroundColor Cyan
    
} catch {
    throw "❌ Erro ao criar ZIP: $($_.Exception.Message)"
}

# --- Limpeza ---
Write-Host "🧹 Limpando staging..." -ForegroundColor Blue
try {
    Remove-Item $StageDir -Recurse -Force
    Write-Host "✅ Staging removido" -ForegroundColor Green
} catch {
    Write-Warning "⚠️ Não foi possível remover completamente o staging: $StageDir"
}

Write-Host ""
Write-Host "🎉 CONCLUÍDO!" -ForegroundColor Green -BackgroundColor DarkGreen
Write-Host "📁 ZIP gerado em: $ZipPath" -ForegroundColor Cyan
Write-Host ""

# --- (Opcional) Abrir pasta do projeto ---
$response = Read-Host "Deseja abrir a pasta do projeto? (s/N)"
if ($response -eq 's' -or $response -eq 'S') {
    Start-Process explorer.exe -ArgumentList $ProjectRoot
}