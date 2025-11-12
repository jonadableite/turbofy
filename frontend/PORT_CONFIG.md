# 🔌 Configuração de Portas - Turbofy

## 📍 Portas Padrão

- **Backend (API)**: `http://localhost:3000`
- **Frontend (Next.js)**: `http://localhost:3001`

## ⚙️ Configuração

### Frontend

O frontend está configurado para rodar na porta **3001** por padrão.

**Scripts no `package.json`:**
```json
{
  "scripts": {
    "dev": "next dev -p 3001",
    "start": "next start -p 3001"
  }
}
```

### Backend

O backend está configurado para rodar na porta **3000** por padrão.

**Variável de ambiente:**
```bash
PORT=3000
```

## 🔗 Conexão Frontend → Backend

O frontend se conecta ao backend através da variável de ambiente:

```bash
# frontend/.env.local ou frontend/.env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Se não configurada, o padrão é `http://localhost:3000`.

## 🚀 Como Rodar

### Terminal 1 - Backend
```bash
cd backend
pnpm run dev
# Servidor rodando em http://localhost:3000
```

### Terminal 2 - Frontend
```bash
cd frontend
pnpm run dev
# Servidor rodando em http://localhost:3001
```

## 🔧 Alterar Portas

### Alterar Porta do Frontend

**Opção 1: Via script (recomendado)**
Edite `frontend/package.json`:
```json
{
  "scripts": {
    "dev": "next dev -p 3002"  // Mude para a porta desejada
  }
}
```

**Opção 2: Via variável de ambiente**
Crie `frontend/.env.local`:
```bash
PORT=3002
```

### Alterar Porta do Backend

Edite `backend/.env`:
```bash
PORT=3001  # Mude para a porta desejada
```

**Importante:** Se mudar a porta do backend, atualize `NEXT_PUBLIC_API_URL` no frontend!

## ✅ Verificação

Após iniciar ambos os servidores, você deve ver:

**Backend:**
```
[TURBOFY GATEWAY - API BACKEND]
[OK] Servidor:       http://localhost:3000
```

**Frontend:**
```
▲ Next.js 16.0.1 (Turbopack)
- Local:        http://localhost:3001
```

## 🐛 Problemas Comuns

### Porta já em uso

**Erro:** `Port 3001 is already in use`

**Solução:**
1. Encontre o processo usando a porta:
   ```bash
   # Windows
   netstat -ano | findstr :3001
   
   # Linux/Mac
   lsof -i :3001
   ```
2. Encerre o processo ou use outra porta

### CORS Error

**Erro:** `Access to fetch at 'http://localhost:3000' from origin 'http://localhost:3001' has been blocked by CORS policy`

**Solução:**
Verifique se o backend tem `CORS_ORIGIN` configurado:
```bash
# backend/.env
CORS_ORIGIN=http://localhost:3001
```

---

**Desenvolvido com ❤️ para o Turbofy Gateway de Pagamentos**

