$ErrorActionPreference = "Stop"

$projectName = "dentia-it"
$composeFile = "docker-compose.integration.yml"
$keepEnvironment = $env:KEEP_INTEGRATION_ENV -eq "1"

if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    $composeCommand = "docker-compose"
    $composePrefix = @()
} elseif (Get-Command docker -ErrorAction SilentlyContinue) {
    $composeCommand = "docker"
    $composePrefix = @("compose")
} else {
    throw "Docker Compose no esta instalado."
}

function Invoke-Compose {
    param(
        [string[]] $ComposeArgs
    )

    & $script:composeCommand @script:composePrefix @ComposeArgs

    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose fallo con codigo $LASTEXITCODE."
    }
}

function Show-Diagnostics {
    Write-Host "Estado del entorno de integracion:"
    & $script:composeCommand @script:composePrefix `
        -p $script:projectName -f $script:composeFile ps -a

    Write-Host "Logs recientes:"
    & $script:composeCommand @script:composePrefix `
        -p $script:projectName -f $script:composeFile logs --tail 150
}

try {
    Write-Host "Limpiando entorno de integracion anterior..."
    Invoke-Compose @(
        "-p", $projectName,
        "-f", $composeFile,
        "down", "-v", "--remove-orphans"
    )

    Write-Host "Construyendo y levantando servicios de integracion..."
    Invoke-Compose @(
        "-p", $projectName,
        "-f", $composeFile,
        "up", "-d", "--build"
    )

    Write-Host "Esperando a que API Gateway y sus dependencias esten saludables..."
    $healthOk = $false

    for ($i = 1; $i -le 90; $i++) {
        try {
            $response = Invoke-WebRequest `
                -Uri "http://localhost:3100/health" `
                -UseBasicParsing `
                -TimeoutSec 5
            $json = $response.Content | ConvertFrom-Json
            $dependencies = @($json.checks.dependencies.PSObject.Properties.Value)
            $dependenciesOk = $dependencies.Count -gt 0 -and `
                ($dependencies | Where-Object { $_.status -ne "ok" }).Count -eq 0

            if (
                $response.StatusCode -eq 200 -and
                $json.status -eq "ok" -and
                $dependenciesOk
            ) {
                $healthOk = $true
                break
            }
        } catch {
        }

        Start-Sleep -Seconds 2
    }

    if (-not $healthOk) {
        throw "El entorno de integracion no quedo saludable."
    }

    Write-Host "Sembrando datos deterministas..."
    $env:POSTGRES_HOST = "localhost"
    $env:POSTGRES_PORT = "5439"
    $env:POSTGRES_USER = "dentia_test"
    $env:POSTGRES_PASSWORD = "dentia_test"
    $env:POSTGRES_DB = "dentia_auth_test"

    & npm.cmd run seed:integration
    if ($LASTEXITCODE -ne 0) {
        throw "El seed de integracion fallo con codigo $LASTEXITCODE."
    }

    Write-Host "Ejecutando pruebas de integracion automatizadas..."
    $env:API_BASE_URL = "http://localhost:3100"
    $env:JWT_SECRET = "integration_test_secret_at_least_32_chars"

    & npm.cmd run test:integration:jest
    if ($LASTEXITCODE -ne 0) {
        throw "Las pruebas de integracion fallaron con codigo $LASTEXITCODE."
    }

    Write-Host "Todas las pruebas de integracion finalizaron correctamente."
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Show-Diagnostics
    exit 1
} finally {
    if ($keepEnvironment) {
        Write-Host "KEEP_INTEGRATION_ENV=1: el entorno permanece activo."
    } else {
        Write-Host "Eliminando entorno de integracion..."
        & $composeCommand @composePrefix `
            -p $projectName -f $composeFile down -v --remove-orphans
    }
}
