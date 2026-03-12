# Arisara Frontend - Setup Guide

## Design System

- **Cores**: Preto Absoluto (#000000) + Rosa (#EC4899)
- **Tipografia**: Glassmorphism com bordas sutis
- **Animações**: Transições suaves e efeitos de hover elegantes

## Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto frontend:

```env
VITE_BACKEND_URL=http://localhost:8000
```

### 2. Instalação

```bash
npm install
```

### 3. Executar em Desenvolvimento

```bash
npm run dev
```

## Estrutura de Autenticação

### Login

- **Endpoint**: `POST /auth/admin/login`
- **Payload**:
  ```json
  {
    "email": "admin@nyoka.ai",
    "password": "admin123"
  }
  ```
- **Response**:
  ```json
  {
    "access_token": "jwt_token",
    "token_type": "bearer",
    "user_id": "uuid",
    "username": "admin",
    "email": "admin@nyoka.ai",
    "company_id": null,
    "mfa_enabled": false
  }
  ```

### Armazenamento

- **Token**: `localStorage.getItem('nyoka_token')` <!-- legacy key kept for Nyoka backend compatibility -->
- **Usuário**: `localStorage.getItem('nyoka_user')`

## Páginas

### Públicas
- `/login` - Tela de login com logos empilhados

### Protegidas (requerem autenticação)
- `/dashboard` - Dashboard principal
- `/analytics` - Análises e métricas
- `/conversations` - Histórico de conversas
- `/documents` - Gerenciamento de documentos
- `/ai/prompt` - Configuração de prompts
- `/ai/model` - Seleção de modelo
- `/ai/examples` - Few-shot examples
- `/settings` - Configurações gerais

## Componentes Principais

### AuthContext
Gerencia estado global de autenticação:
- `user` - Dados do usuário autenticado
- `token` - JWT token
- `login(email, password)` - Função de login
- `logout()` - Função de logout
- `isAuthenticated` - Boolean de autenticação
- `isLoading` - Estado de carregamento

### Layout
Container principal para páginas autenticadas:
- Sidebar fixa
- Background preto absoluto
- Responsivo mobile

### Sidebar
Navegação principal:
- Logos Arisara (ícone + lettering)
- Menu expandível
- Logout button

## Criando Novo Usuário Admin

No backend, execute:

```bash
cd c:\Repositorios\nyoka\nyoka
psql -U postgres -d nyoka -f scripts/create_admin_user.sql
```

Ou gere um novo hash de senha:

```bash
python scripts/generate_password_hash.py
```

## Troubleshooting

### Token Expirado
O sistema verifica automaticamente a expiração do token a cada 30 segundos e redireciona para login se necessário.

### CORS Issues
Certifique-se de que o backend permite requisições do frontend:
- Configurar CORS no FastAPI
- URL correta em `VITE_BACKEND_URL`

