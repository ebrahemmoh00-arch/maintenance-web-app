param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("Start", "Stop", "Restart", "Rebuild", "Backup", "Restore", "Update", "HealthCheck")]
    [string]$Action
)

$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$FrontendUrl = "http://localhost:5173"
$BackendHealthUrl = "http://localhost:8000/health"
$SwaggerUrl = "http://localhost:8000/docs"
$BackupsDir = Join-Path $ProjectRoot "backups"
$LogsDir = Join-Path $ProjectRoot "logs"
$BackupLogPath = Join-Path $LogsDir "backup.log"

$Containers = [ordered]@{
    "PostgreSQL" = "cmms-postgres"
    "Backend" = "cmms-backend"
    "Frontend" = "cmms-frontend"
}

function Set-ProjectLocation {
    Set-Location $ProjectRoot
}

function Write-Section {
    param([string]$Text)
    Write-Host ""
    Write-Host "==== $Text ===="
}

function Write-Ok {
    param([string]$Text)
    Write-Host "[OK] $Text" -ForegroundColor Green
}

function Write-Fail {
    param([string]$Text)
    Write-Host "[FAILED] $Text" -ForegroundColor Red
}

function Write-Warn {
    param([string]$Text)
    Write-Host "[WARN] $Text" -ForegroundColor Yellow
}

function Write-BackupLog {
    param([string]$Text)
    New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Text
    Add-Content -Path $BackupLogPath -Value $line -Encoding UTF8
}

function Test-DockerCommand {
    return [bool](Get-Command docker -ErrorAction SilentlyContinue)
}

function Test-DockerRunning {
    if (-not (Test-DockerCommand)) {
        return $false
    }
    & docker info *> $null
    return ($LASTEXITCODE -eq 0)
}

function Assert-DockerReady {
    if (-not (Test-DockerCommand)) {
        throw "Docker CLI was not found. Install Docker Desktop, then try again."
    }
    if (-not (Test-DockerRunning)) {
        throw "Docker Desktop is not running. Start Docker Desktop and wait until it is ready."
    }
}

function Assert-EnvFile {
    $envPath = Join-Path $ProjectRoot ".env"
    if (-not (Test-Path $envPath)) {
        throw ".env was not found. Copy .env.example to .env and update the values first."
    }
}

function Get-EnvFileValue {
    param([string]$Name)
    $envPath = Join-Path $ProjectRoot ".env"
    if (-not (Test-Path $envPath)) {
        return ""
    }
    foreach ($rawLine in Get-Content -Path $envPath) {
        $line = $rawLine.Trim()
        if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
            continue
        }
        $key, $value = $line.Split("=", 2)
        if ($key.Trim() -eq $Name) {
            $cleanValue = $value.Trim()
            if ($cleanValue.Length -ge 2 -and (($cleanValue.StartsWith('"') -and $cleanValue.EndsWith('"')) -or ($cleanValue.StartsWith("'") -and $cleanValue.EndsWith("'")))) {
                return $cleanValue.Substring(1, $cleanValue.Length - 2)
            }
            return $cleanValue
        }
    }
    return ""
}

function ConvertTo-ShSingleQuoted {
    param([string]$Value)
    return "'" + ($Value -replace "'", "'\''") + "'"
}

function Get-PostgresComposeServiceName {
    $composePath = Join-Path $ProjectRoot "docker-compose.yml"
    if (-not (Test-Path $composePath)) {
        throw "docker-compose.yml was not found."
    }

    $insideServices = $false
    $currentService = ""
    foreach ($rawLine in Get-Content -Path $composePath) {
        if ($rawLine -match "^services:\s*$") {
            $insideServices = $true
            continue
        }
        if (-not $insideServices) {
            continue
        }
        if ($rawLine -match "^\S") {
            break
        }
        if ($rawLine -match "^  ([A-Za-z0-9_-]+):\s*$") {
            $currentService = $Matches[1]
            continue
        }
        if ($currentService -and $rawLine -match "^\s+image:\s*postgres(:|@|$)") {
            return $currentService
        }
    }

    throw "PostgreSQL service was not found in docker-compose.yml."
}

function Invoke-Compose {
    param([string[]]$Arguments)
    Set-ProjectLocation
    & docker compose @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose $($Arguments -join ' ') failed."
    }
}

function Get-ContainerHealth {
    param([string]$ContainerName)
    try {
        $status = (& docker inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}" $ContainerName 2>$null | Select-Object -First 1)
        if ([string]::IsNullOrWhiteSpace($status)) {
            return "missing"
        }
        return $status.Trim()
    } catch {
        return "missing"
    }
}

function Wait-ContainerHealthy {
    param(
        [string]$Label,
        [string]$ContainerName,
        [int]$TimeoutSeconds = 180
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        $status = Get-ContainerHealth $ContainerName
        if ($status -eq "healthy") {
            Write-Ok "$Label is $status."
            return
        }
        Write-Host "Waiting for $Label... current status: $status"
        Start-Sleep -Seconds 5
    } while ((Get-Date) -lt $deadline)
    throw "$Label did not become healthy before timeout."
}

function Wait-AllServicesHealthy {
    param([int]$TimeoutSeconds = 240)
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        $statuses = @()
        $allHealthy = $true
        foreach ($item in $Containers.GetEnumerator()) {
            $status = Get-ContainerHealth $item.Value
            $statuses += "$($item.Key): $status"
            if ($status -ne "healthy") {
                $allHealthy = $false
            }
        }
        if ($allHealthy) {
            Write-Ok "All CMMS services are healthy."
            return
        }
        Write-Host "Waiting for services... $($statuses -join ' | ')"
        Start-Sleep -Seconds 5
    } while ((Get-Date) -lt $deadline)
    throw "Services did not become healthy before timeout."
}

function Open-CMMSUrls {
    Start-Process $FrontendUrl
    Start-Process $SwaggerUrl
}

function Invoke-Start {
    Assert-DockerReady
    Assert-EnvFile
    Write-Section "Starting CMMS"
    Invoke-Compose @("up", "-d")
    Wait-AllServicesHealthy
    Open-CMMSUrls
    Write-Ok "CMMS started successfully."
    Write-Host "Frontend: $FrontendUrl"
    Write-Host "Swagger:  $SwaggerUrl"
}

function Invoke-Stop {
    Assert-DockerReady
    Write-Section "Stopping CMMS"
    Invoke-Compose @("down")
    Write-Ok "All CMMS services were stopped."
}

function Invoke-Restart {
    Assert-DockerReady
    Assert-EnvFile
    Write-Section "Restarting CMMS"
    Invoke-Compose @("down")
    Invoke-Compose @("up", "-d")
    Wait-AllServicesHealthy -TimeoutSeconds 120
    Write-Ok "CMMS restarted successfully."
}

function Invoke-Rebuild {
    Assert-DockerReady
    Assert-EnvFile
    Write-Section "Rebuilding CMMS"
    Invoke-Compose @("down")
    Invoke-Compose @("up", "--build", "-d")
    Wait-AllServicesHealthy
    Write-Ok "CMMS rebuilt and started successfully."
}

function Invoke-Backup {
    Assert-DockerReady
    Assert-EnvFile
    Set-ProjectLocation
    New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
    Write-BackupLog "Backup started."
    $postgresService = Get-PostgresComposeServiceName
    $postgresUser = Get-EnvFileValue "POSTGRES_USER"
    $postgresDb = Get-EnvFileValue "POSTGRES_DB"
    if (-not $postgresUser) {
        throw "POSTGRES_USER is missing in .env."
    }
    if (-not $postgresDb) {
        throw "POSTGRES_DB is missing in .env."
    }
    Write-BackupLog "PostgreSQL compose service: $postgresService"
    Write-BackupLog "Database user read from .env: $postgresUser"
    Write-BackupLog "Database name read from .env: $postgresDb"
    Wait-ContainerHealthy -Label "PostgreSQL" -ContainerName $Containers["PostgreSQL"] -TimeoutSeconds 120
    New-Item -ItemType Directory -Path $BackupsDir -Force | Out-Null
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
    $backupPath = Join-Path $BackupsDir "backup_$timestamp.sql"
    $dumpCommand = "pg_dump --clean --if-exists -U $(ConvertTo-ShSingleQuoted $postgresUser) -d $(ConvertTo-ShSingleQuoted $postgresDb)"
    Write-Section "Creating PostgreSQL backup"
    Write-BackupLog "Command: docker compose exec -T $postgresService sh -c `"$dumpCommand`""
    & docker compose exec -T $postgresService sh -c $dumpCommand 1> $backupPath 2>> $BackupLogPath
    if ($LASTEXITCODE -ne 0) {
        $exitCode = $LASTEXITCODE
        Remove-Item $backupPath -Force -ErrorAction SilentlyContinue
        Write-BackupLog "Backup failed with exit code $exitCode."
        $tail = ""
        if (Test-Path $BackupLogPath) {
            $tail = (Get-Content -Path $BackupLogPath -Tail 20) -join [Environment]::NewLine
        }
        throw "Database backup failed with exit code $exitCode. Log file: $BackupLogPath`n$tail"
    }
    Write-BackupLog "Backup created successfully: $backupPath"
    Write-Ok "Backup created: $backupPath"
    Write-Host "Backup log: $BackupLogPath"
}

function Invoke-Restore {
    Assert-DockerReady
    Assert-EnvFile
    Set-ProjectLocation
    Wait-ContainerHealthy -Label "PostgreSQL" -ContainerName $Containers["PostgreSQL"] -TimeoutSeconds 120
    if (-not (Test-Path $BackupsDir)) {
        throw "No backups folder was found."
    }
    $files = @(Get-ChildItem -Path $BackupsDir -Filter "*.sql" | Sort-Object LastWriteTime -Descending)
    if ($files.Count -eq 0) {
        throw "No .sql backup files were found in the backups folder."
    }
    Write-Section "Available Backups"
    for ($i = 0; $i -lt $files.Count; $i++) {
        Write-Host ("[{0}] {1}" -f ($i + 1), $files[$i].Name)
    }
    $choice = Read-Host "Enter backup number to restore"
    $index = 0
    if (-not [int]::TryParse($choice, [ref]$index) -or $index -lt 1 -or $index -gt $files.Count) {
        throw "Invalid backup selection."
    }
    $selected = $files[$index - 1]
    $confirmation = Read-Host "Type RESTORE to confirm restoring $($selected.Name)"
    if ($confirmation -ne "RESTORE") {
        Write-Warn "Restore cancelled."
        return
    }
    $restoreCommand = 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
    Write-Section "Restoring PostgreSQL backup"
    Get-Content -Path $selected.FullName -Raw | & docker compose exec -T postgres sh -c $restoreCommand
    if ($LASTEXITCODE -ne 0) {
        throw "Database restore failed."
    }
    Write-Ok "Database restored from: $($selected.FullName)"
}

function Invoke-Update {
    Assert-DockerReady
    Assert-EnvFile
    Set-ProjectLocation
    Write-Section "Updating Project"
    & git pull
    if ($LASTEXITCODE -ne 0) {
        throw "git pull failed."
    }
    Invoke-Compose @("up", "--build", "-d")
    Wait-AllServicesHealthy
    Write-Ok "Project updated and CMMS started successfully."
}

function Test-HttpEndpoint {
    param([string]$Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
    } catch {
        return $false
    }
}

function Write-HealthResult {
    param(
        [string]$Name,
        [bool]$Healthy,
        [string]$Detail = ""
    )
    if ($Healthy) {
        Write-Host ("{0}: Healthy {1}" -f $Name, $Detail) -ForegroundColor Green
    } else {
        Write-Host ("{0}: Failed {1}" -f $Name, $Detail) -ForegroundColor Red
    }
}

function Invoke-HealthCheck {
    Write-Section "CMMS Health Check"
    $dockerCli = Test-DockerCommand
    Write-HealthResult -Name "Docker CLI" -Healthy $dockerCli
    $dockerRunning = Test-DockerRunning
    Write-HealthResult -Name "Docker Desktop" -Healthy $dockerRunning
    $envExists = Test-Path (Join-Path $ProjectRoot ".env")
    Write-HealthResult -Name ".env file" -Healthy $envExists

    if (-not $dockerRunning) {
        Write-HealthResult -Name "PostgreSQL" -Healthy $false -Detail "(Docker is not running)"
        Write-HealthResult -Name "Backend" -Healthy $false -Detail "(Docker is not running)"
        Write-HealthResult -Name "Frontend" -Healthy $false -Detail "(Docker is not running)"
        exit 1
    }

    $postgresStatus = Get-ContainerHealth $Containers["PostgreSQL"]
    $postgresHealthy = $postgresStatus -eq "healthy"
    $backendHealthy = Test-HttpEndpoint $BackendHealthUrl
    $frontendHealthy = Test-HttpEndpoint $FrontendUrl
    Write-HealthResult -Name "PostgreSQL" -Healthy $postgresHealthy -Detail "(container: $postgresStatus)"
    Write-HealthResult -Name "Backend" -Healthy $backendHealthy -Detail "($BackendHealthUrl)"
    Write-HealthResult -Name "Frontend" -Healthy $frontendHealthy -Detail "($FrontendUrl)"

    if ($dockerCli -and $dockerRunning -and $envExists -and $postgresHealthy -and $backendHealthy -and $frontendHealthy) {
        exit 0
    }
    exit 1
}

try {
    switch ($Action) {
        "Start" { Invoke-Start }
        "Stop" { Invoke-Stop }
        "Restart" { Invoke-Restart }
        "Rebuild" { Invoke-Rebuild }
        "Backup" { Invoke-Backup }
        "Restore" { Invoke-Restore }
        "Update" { Invoke-Update }
        "HealthCheck" { Invoke-HealthCheck }
    }
} catch {
    if ($Action -eq "Backup") {
        Write-BackupLog "Backup failed: $($_.Exception.Message)"
    }
    Write-Fail $_.Exception.Message
    exit 1
}
