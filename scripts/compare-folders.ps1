param(
  [Parameter(Mandatory=$true)][string]$Source,
  [Parameter(Mandatory=$true)][string]$Target,
  [switch]$ByName,
  [switch]$WithSize,
  [switch]$WithHash,
  [string]$OutCsv
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-FileHashSafe {
  param([string]$Path)
  try { return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash }
  catch { return $null }
}

function Make-Key {
  param([System.IO.FileInfo]$File, [string]$Root, [switch]$IsDest)
  if ($ByName) {
    $k = $File.Name.ToLowerInvariant()
    if ($WithSize) { $k = "$k|$($File.Length)" }
    if ($WithHash) {
      $h = Get-FileHashSafe -Path $File.FullName
      if ($h) { $k = "$k|$h" } else { $k = "$k|nohash" }
    }
    return $k
  } else {
    $root = $Root.TrimEnd('\\','/')
    $rel = $File.FullName.Substring($root.Length).TrimStart('\\','/')
    return $rel.ToLowerInvariant()
  }
}

function Load-Index {
  param([string]$Root)
  $files = Get-ChildItem -LiteralPath $Root -Recurse -File -ErrorAction SilentlyContinue
  $index = @{}
  foreach ($f in $files) {
    $key = Make-Key -File $f -Root $Root
    if (-not $index.ContainsKey($key)) { $index[$key] = @() }
    $index[$key] += [pscustomobject]@{
      Key      = $key
      FullName = $f.FullName
      Name     = $f.Name
      Length   = $f.Length
      LastWriteTime = $f.LastWriteTime
    }
  }
  return ,@($files, $index)
}

function Compare-Folders {
  param([string]$Src, [string]$Dst)
  $srcPath = ((Resolve-Path -LiteralPath $Src).Path)
  $dstPath = ((Resolve-Path -LiteralPath $Dst).Path)

  Write-Host "Scanning source..." -ForegroundColor Cyan
  $s = Load-Index -Root $srcPath
  $srcFiles = $s[0]; $srcIndex = $s[1]

  Write-Host "Scanning target..." -ForegroundColor Cyan
  $d = Load-Index -Root $dstPath
  $dstFiles = $d[0]; $dstIndex = $d[1]

  $srcKeys = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($k in $srcIndex.Keys) { [void]$srcKeys.Add($k) }
  $dstKeys = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($k in $dstIndex.Keys) { [void]$dstKeys.Add($k) }

  $onlyInSrc = @()
  foreach ($k in $srcKeys) { if (-not $dstKeys.Contains($k)) { $onlyInSrc += $k } }
  $onlyInDst = @()
  foreach ($k in $dstKeys) { if (-not $srcKeys.Contains($k)) { $onlyInDst += $k } }

  $resultMissingInTarget = foreach ($k in $onlyInSrc) {
    foreach ($fi in $srcIndex[$k]) { $fi }
  }
  $resultExtraInTarget = foreach ($k in $onlyInDst) {
    foreach ($fi in $dstIndex[$k]) { $fi }
  }

  $summary = [pscustomobject]@{
    Mode              = if ($ByName) { if ($WithHash) { 'ByName|Size|Hash' } elseif ($WithSize) { 'ByName|Size' } else { 'ByName' } } else { 'RelativePath' }
    Source            = $srcPath
    Target            = $dstPath
    SourceFiles       = $srcFiles.Count
    TargetFiles       = $dstFiles.Count
    MissingInTarget   = $resultMissingInTarget.Count
    ExtraInTarget     = $resultExtraInTarget.Count
  }

  Write-Host ""; Write-Host "=== Summary ===" -ForegroundColor Yellow
  $summary | Format-List | Out-String | Write-Host

  Write-Host "--- Missing in Target (present in Source only) ---" -ForegroundColor Yellow
  $resultMissingInTarget | Sort-Object Name, Length | Select-Object FullName, Length, LastWriteTime | Format-Table -AutoSize

  Write-Host "--- Extra in Target (present in Target only) ---" -ForegroundColor Yellow
  $resultExtraInTarget | Sort-Object Name, Length | Select-Object FullName, Length, LastWriteTime | Format-Table -AutoSize

  if ($OutCsv) {
    $outDir = Split-Path -Parent $OutCsv
    if ($outDir -and -not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
    $resultMissingInTarget | Export-Csv -NoTypeInformation -Encoding UTF8 -Path $OutCsv
    Write-Host "Saved CSV: $OutCsv" -ForegroundColor Green
  }
}

Compare-Folders -Src $Source -Dst $Target

