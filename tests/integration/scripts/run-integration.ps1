$ErrorActionPreference = "Stop"

Write-Host "Levantando entorno de integración..."

docker compose -p dentia-it -f docker-compose.integration.yml down -v
docker compose -p dentia-it -f docker-compose.integration.yml up -d --build

Write-Host "Esperando API Gateway saludable..."

$healthOk = $false

for ($i = 1; $i -le 45; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3100/health" -UseBasicParsing
        $json = $response.Content | ConvertFrom-Json

        if ($response.StatusCode -eq 200 -and $json.status -eq "ok") {
            $healthOk = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }

    Start-Sleep -Seconds 2
}

if (-not $healthOk) {
    Write-Host "El entorno de integración no quedó saludable."
    docker compose -p dentia-it -f docker-compose.integration.yml ps -a
    docker compose -p dentia-it -f docker-compose.integration.yml logs api-gateway-it
    exit 1
}

Write-Host "Entorno saludable. Ejecutando pruebas automatizadas..."

$env:API_BASE_URL = "http://localhost:3100"

npm run test:integration

if ($LASTEXITCODE -ne 0) {
    Write-Host "Pruebas de integración fallidas."
    docker compose -p dentia-it -f docker-compose.integration.yml ps -a
    exit $LASTEXITCODE
}

Write-Host "Pruebas de integración finalizadas correctamente."