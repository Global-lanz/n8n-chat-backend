# Script de teste do webhook de criação de usuários
# Uso: .\test-webhook.ps1 -Token "SEU_TOKEN_AQUI"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    
    [string]$ApiUrl = "http://localhost:3000/api/webhook/create-client"
)

Write-Host "🧪 Script de Teste - Webhook de Criação de Usuários" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$tokenPreview = $Token.Substring(0, [Math]::Min(10, $Token.Length)) + "..."
Write-Host "🔑 Token: $tokenPreview" -ForegroundColor Yellow
Write-Host "🌐 URL: $ApiUrl" -ForegroundColor Yellow
Write-Host ""

# Headers padrão
$headers = @{
    "Content-Type" = "application/json"
    "x-webhook-token" = $Token
}

# Teste 1: Criar novo usuário
Write-Host "📝 Teste 1: Criando novo usuário..." -ForegroundColor Green
Write-Host "-----------------------------------"
$body1 = @{
    email = "usuario.teste@example.com"
    name = "Usuário de Teste"
    event = "PURCHASE_COMPLETE"
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri $ApiUrl -Method Post -Headers $headers -Body $body1
    $response1 | ConvertTo-Json -Depth 5 | Write-Host
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    $_.Exception.Response | ConvertTo-Json -Depth 5 | Write-Host
}

Write-Host ""
Write-Host ""

# Teste 2: Renovar licença
Write-Host "🔄 Teste 2: Renovando licença do usuário..." -ForegroundColor Green
Write-Host "-----------------------------------"
Start-Sleep -Seconds 2
$body2 = @{
    email = "usuario.teste@example.com"
    name = "Usuário de Teste"
    event = "SUBSCRIPTION_CREATED"
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri $ApiUrl -Method Post -Headers $headers -Body $body2
    $response2 | ConvertTo-Json -Depth 5 | Write-Host
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host ""

# Teste 3: Simular reembolso
Write-Host "💰 Teste 3: Simulando reembolso..." -ForegroundColor Green
Write-Host "-----------------------------------"
Start-Sleep -Seconds 2
$body3 = @{
    email = "usuario.teste@example.com"
    name = "Usuário de Teste"
    event = "PURCHASE_REFUNDED"
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri $ApiUrl -Method Post -Headers $headers -Body $body3
    $response3 | ConvertTo-Json -Depth 5 | Write-Host
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host ""

# Teste 4: Token inválido
Write-Host "🚫 Teste 4: Testando token inválido..." -ForegroundColor Green
Write-Host "-----------------------------------"
Start-Sleep -Seconds 2
$headersInvalid = @{
    "Content-Type" = "application/json"
    "x-webhook-token" = "token-invalido-123"
}

try {
    $response4 = Invoke-RestMethod -Uri $ApiUrl -Method Post -Headers $headersInvalid -Body $body1
    $response4 | ConvertTo-Json -Depth 5 | Write-Host
} catch {
    Write-Host "❌ Resposta esperada (token inválido):" -ForegroundColor Yellow
    Write-Host $_.ErrorDetails.Message
}

Write-Host ""
Write-Host ""
Write-Host "✅ Testes concluídos!" -ForegroundColor Green
Write-Host ""
