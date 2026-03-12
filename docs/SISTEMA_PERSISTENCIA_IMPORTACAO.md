# 🔄 Sistema de Persistência de Progresso de Importações

## 📋 Visão Geral

Este documento descreve o sistema de persistência de progresso de importações implementado no frontend, que mantém o estado das importações mesmo após recarregar a página ou navegar entre abas.

## 🎯 Objetivos

- ✅ **Persistência**: Manter o progresso das importações no `localStorage`
- ✅ **Reconexão Automática**: Reconectar ao SSE do backend automaticamente
- ✅ **Notificações Visuais**: Exibir progresso em tempo real em todas as páginas
- ✅ **Recuperação de Sessão**: Retomar importações em andamento após recarregar

## 🏗️ Arquitetura

### 1. Hook Customizado: `useImportProgress`

**Localização**: `src/hooks/useImportProgress.ts`

O hook gerencia todo o ciclo de vida das importações:

```typescript
interface ImportProgressState {
  import_id: string;              // ID único da importação
  preview_id?: string;             // ID do preview (se aplicável)
  type: 'hierarchical' | 'entities' | 'assets' | 'invoices' | 'preview';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress_percent: number;        // Progresso atual (0-100)
  filename: string;                // Nome do arquivo
  provider_id?: string;            // ID do provedor
  provider_name?: string;          // Nome do provedor
  started_at: string;              // Timestamp de início
  current_item?: string;           // Item atual sendo processado
  stats?: {                        // Estatísticas em tempo real
    entities_created?: number;
    assets_created?: number;
    invoices_created?: number;
    // ... outros contadores
  };
  result?: any;                    // Resultado final
}
```

#### Funcionalidades Principais:

1. **Armazenamento Persistente**
   - Salva automaticamente no `localStorage` com a chave `import_progress`
   - Filtra importações antigas (> 24 horas)
   - Mantém importações recentes concluídas por 30 minutos

2. **Conexão SSE Inteligente**
   - Conecta automaticamente ao endpoint `/progress/{import_id}`
   - Reconexão automática com backoff exponencial (até 5 tentativas)
   - Fecha conexões automaticamente ao completar
   - Gerencia múltiplas importações simultâneas

3. **API Exposta**
   ```typescript
   {
     activeImports: ImportProgressState[],  // Lista de importações ativas
     registerImport: (data) => string,      // Registrar nova importação
     updateImport: (id, updates) => void,   // Atualizar importação
     removeImport: (id) => void,            // Remover importação
     clearCompleted: () => void,            // Limpar concluídas
     getImport: (id) => ImportProgressState, // Obter importação específica
     hasActiveImports: boolean              // Se há importações ativas
   }
   ```

### 2. Componente de Notificação: `ImportProgressNotification`

**Localização**: `src/components/ImportProgressNotification.tsx`

Componente flutuante que exibe o progresso de todas as importações:

#### Características:

- 📍 **Posicionamento**: Canto inferior direito (fixed)
- 🎨 **Visual**: Card glassmorphism com borda azul
- 📊 **Informações Exibidas**:
  - Nome do arquivo
  - Tipo de importação
  - Status atual (badge colorido)
  - Provedor
  - Barra de progresso
  - Estatísticas em tempo real
  - Timestamp de início

- 🎛️ **Controles**:
  - Minimizar/Maximizar
  - Limpar todas as concluídas
  - Remover individualmente

#### Estados Visuais:

| Status | Ícone | Cor | Descrição |
|--------|-------|-----|-----------|
| `pending` | ⏳ | Azul | Aguardando início |
| `processing` | 🔄 | Azul (animado) | Em processamento |
| `completed` | ✅ | Verde | Concluída com sucesso |
| `error` | ❌ | Vermelho | Erro no processamento |

### 3. Integração no App

**Arquivo**: `src/App.tsx`

```typescript
{isAuthenticated && <ImportProgressNotification />}
```

O componente é renderizado globalmente quando o usuário está autenticado, garantindo visibilidade em todas as páginas.

### 4. Integração no Componente de Importação

**Arquivo**: `src/components/ImportacaoExcel.tsx`

#### Preview:
```typescript
const uploadFile = async () => {
  const preview_id = `preview-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  // Registrar preview
  registerImport({
    preview_id: preview_id,
    type: 'preview',
    filename: hierarchicalFile.name,
    provider_id: selectedProvider,
    provider_name: providerName,
  });
  
  // ... resto do código
};
```

#### Importação:
```typescript
const importHierarchical = async () => {
  // ... enviar arquivo
  
  if (result.import_id) {
    // Registrar importação
    registerImport({
      import_id: result.import_id,
      type: 'hierarchical',
      filename: hierarchicalFile.name,
      provider_id: selectedProvider,
      provider_name: providerName,
    });
  }
  
  // ... resto do código
};
```

## 🔄 Fluxo de Funcionamento

### Cenário 1: Importação Normal

1. **Usuário inicia importação**
   - `ImportacaoExcel` chama `registerImport()`
   - Hook salva no `localStorage`
   - Hook conecta ao SSE `/progress/{id}`

2. **Durante o processamento**
   - SSE envia atualizações em tempo real
   - Hook atualiza estado e `localStorage`
   - `ImportProgressNotification` exibe progresso

3. **Ao concluir**
   - Hook fecha conexão SSE
   - Marca status como `completed` ou `error`
   - Mantém por 30 minutos para visualização

### Cenário 2: Recarregar Página

1. **Página recarrega**
   - Hook lê `localStorage` no `useEffect`
   - Identifica importações em progresso
   - Reconecta automaticamente ao SSE

2. **Continua monitoramento**
   - Recebe atualizações normalmente
   - Exibe progresso atualizado
   - Usuário não perde nenhuma informação

### Cenário 3: Navegar Entre Abas

1. **Usuário muda de página**
   - `ImportProgressNotification` permanece renderizado
   - Conexões SSE permanecem ativas
   - Progresso visível em todas as páginas

2. **Retorna à página de importação**
   - Pode ver resultado atualizado
   - Estado sincronizado com notificação

### Cenário 4: Erro de Conexão

1. **SSE perde conexão**
   - Hook detecta erro (`onerror`)
   - Tenta reconectar automaticamente
   - Backoff exponencial: 2s, 4s, 6s, 8s, 10s

2. **Após 5 tentativas**
   - Marca importação como `error`
   - Usuário pode remover e tentar novamente

## 📊 Estrutura do LocalStorage

```json
{
  "import_progress": [
    {
      "import_id": "import-123456",
      "type": "hierarchical",
      "status": "processing",
      "progress_percent": 45,
      "filename": "contratos_janeiro.xlsx",
      "provider_id": "prov-789",
      "provider_name": "Provedor XYZ",
      "started_at": "2025-10-08T14:30:00.000Z",
      "current_item": "Processando fatura 45 de 100",
      "stats": {
        "entities_created": 12,
        "assets_created": 8,
        "invoices_created": 45
      }
    }
  ]
}
```

## 🎨 Interface Visual

### Notificação Minimizada
```
┌─────────────────────────┐
│ 📄 Importações (2)      │
│ ▢ Limpar               │
└─────────────────────────┘
```

### Notificação Expandida
```
┌─────────────────────────────────────┐
│ 📄 Importações (2)  ▢ - Limpar     │
├─────────────────────────────────────┤
│ 🔄 Importação Hierárquica           │
│    Processando                       │
│                                     │
│ contratos_janeiro.xlsx              │
│ Provedor: Provedor XYZ              │
│                                     │
│ ▓▓▓▓▓▓▓░░░░░░░░░ 45%               │
│                                     │
│ ✓ 12 entidades  🏠 8 imóveis        │
│ 📄 45 faturas                       │
│                                     │
│ Iniciado em: 08/10/2025 14:30      │
├─────────────────────────────────────┤
│ ✅ Importação de Entidades          │
│    Concluída                    ✕   │
│                                     │
│ usuarios.csv                        │
│ ✓ 150 entidades                     │
│                                     │
│ Iniciado em: 08/10/2025 14:00      │
└─────────────────────────────────────┘
```

## 🔧 Manutenção e Limpeza

### Limpeza Automática

1. **Importações antigas** (> 24h): Removidas ao carregar
2. **Concluídas recentes** (< 30min): Mantidas para visualização
3. **Em progresso**: Sempre mantidas

### Limpeza Manual

- **Botão "Limpar"**: Remove todas as concluídas e com erro
- **Botão "✕"**: Remove importação individual

## 🚀 Benefícios

1. ✅ **Experiência do Usuário**
   - Não perde progresso ao recarregar
   - Pode navegar livremente
   - Feedback visual constante

2. ✅ **Confiabilidade**
   - Reconexão automática
   - Persistência garantida
   - Recuperação de falhas

3. ✅ **Visibilidade**
   - Progresso em tempo real
   - Múltiplas importações simultâneas
   - Histórico recente

4. ✅ **Manutenibilidade**
   - Código desacoplado
   - Hook reutilizável
   - Fácil debugging

## 🔍 Debugging

### Console Logs

O sistema inclui logs detalhados:

```
🔗 Conectando ao SSE para importação: import-123456
✅ Conexão SSE estabelecida para: import-123456
📊 Progresso recebido para import-123456: 45 %
✅ Importação import-123456 finalizada com status: completed
```

### LocalStorage

Inspecionar no DevTools:
```javascript
// Ver importações salvas
JSON.parse(localStorage.getItem('import_progress'))

// Limpar manualmente (se necessário)
localStorage.removeItem('import_progress')
```

## 📝 Próximos Passos (Futuro)

- [ ] Adicionar som de notificação ao concluir
- [ ] Permitir pausar/cancelar importações
- [ ] Histórico completo de importações
- [ ] Exportar logs de importação
- [ ] Notificações push (via Service Worker)
- [ ] Sincronização entre múltiplas abas abertas

## 🤝 Contribuindo

Para adicionar novo tipo de importação:

1. Atualizar type do `ImportProgressState`
2. Adicionar label em `getTypeLabel()`
3. Registrar importação com `registerImport()`
4. Backend deve enviar eventos SSE no formato correto

## 📚 Referências

- [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [LocalStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [React Hooks](https://react.dev/reference/react)



