#!/bin/bash

# Script de teste do webhook de criação de usuários
# Uso: ./test-webhook.sh [TOKEN]

echo "🧪 Script de Teste - Webhook de Criação de Usuários"
echo "=================================================="
echo ""

# Verifica se o token foi fornecido
if [ -z "$1" ]; then
    echo "❌ Erro: Token não fornecido"
    echo "Uso: ./test-webhook.sh SEU_TOKEN_AQUI"
    exit 1
fi

TOKEN="$1"
API_URL="http://localhost:3000/api/webhook/create-client"

echo "🔑 Token: ${TOKEN:0:10}..."
echo "🌐 URL: $API_URL"
echo ""

# Teste 1: Criar novo usuário
echo "📝 Teste 1: Criando novo usuário..."
echo "-----------------------------------"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-webhook-token: $TOKEN" \
  -d '{
    "email": "usuario.teste@example.com",
    "name": "Usuário de Teste",
    "event": "PURCHASE_COMPLETE"
  }' | jq .

echo ""
echo ""

# Teste 2: Renovar licença do mesmo usuário
echo "🔄 Teste 2: Renovando licença do usuário..."
echo "-----------------------------------"
sleep 2
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-webhook-token: $TOKEN" \
  -d '{
    "email": "usuario.teste@example.com",
    "name": "Usuário de Teste",
    "event": "SUBSCRIPTION_CREATED"
  }' | jq .

echo ""
echo ""

# Teste 3: Simular reembolso
echo "💰 Teste 3: Simulando reembolso..."
echo "-----------------------------------"
sleep 2
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-webhook-token: $TOKEN" \
  -d '{
    "email": "usuario.teste@example.com",
    "name": "Usuário de Teste",
    "event": "PURCHASE_REFUNDED"
  }' | jq .

echo ""
echo ""

# Teste 4: Token inválido
echo "🚫 Teste 4: Testando token inválido..."
echo "-----------------------------------"
sleep 2
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-webhook-token: token-invalido-123" \
  -d '{
    "email": "usuario.teste@example.com",
    "name": "Usuário de Teste",
    "event": "PURCHASE_COMPLETE"
  }' | jq .

echo ""
echo ""
echo "✅ Testes concluídos!"
echo ""
