# Sistema de Importação - Frontend

## Visão Geral

O sistema de importação do frontend foi completamente recriado para integrar com a nova **engine híbrida** do backend. Ele oferece uma interface moderna e completa para importação de arquivos Excel, CSV e JSON.

## Arquitetura

### Componentes Principais

1. **`ImportacaoExcel.tsx`** - Componente principal (948 linhas)
2. **`importApi.ts`** - Serviço de API para integração
3. **`import.ts`** - Tipos TypeScript
4. **`fetchWithAuth.ts`** - Utilitário de autenticação

### Tecnologias Utilizadas

- **React 18** + **TypeScript**
- **Shadcn/ui** - Componentes UI
- **Tailwind CSS** - Estilização
- **Lucide React** - Ícones
- **React Hook Form** - Formulários
- **Zustand** - Gerenciamento de estado

## Funcionalidades

### 1. Upload de Arquivos
- **Formatos suportados**: Excel (.xlsx, .xls), CSV (.csv), JSON (.json)
- **Validação de tipos** automática
- **Progress bar** durante upload
- **Descrição opcional** para cada importação

### 2. Dashboard de Estatísticas
- Total de importações
- Importações bem-sucedidas
- Importações com falha
- Total de registros processados

### 3. Histórico de Importações
- **Lista completa** de todas as importações
- **Filtros por status**: Pendente, Validando, Validado, Processando, Concluído, Falhou
- **Ações por status**:
  - **Pendente**: Validar dados
  - **Validado**: Processar importação
  - **Qualquer**: Visualizar preview, Excluir

### 4. Preview de Dados
- **Visualização** dos primeiros 10 registros
- **Tradução automática** de nomes de colunas
- **Formatação inteligente** de valores (CPF, telefone, valores monetários)
- **Exibição de erros e warnings**
- **Processamento direto** do preview

### 5. Interface por Tabs
- **Upload**: Envio de arquivos
- **Importações**: Histórico e gerenciamento
- **Preview**: Visualização de dados

## Fluxo de Uso

### 1. Upload
```
1. Selecionar arquivo (Excel/CSV/JSON)
2. Adicionar descrição (opcional)
3. Clicar em "Fazer Upload"
4. Aguardar confirmação
```

### 2. Validação
```
1. Na aba "Importações", localizar importação "Pendente"
2. Clicar no ícone de configurações (⚙️)
3. Aguardar validação automática
4. Status muda para "Validado"
```

### 3. Preview
```
1. Clicar no ícone de olho (👁️) em qualquer importação
2. Ir para aba "Preview"
3. Visualizar dados formatados
4. Verificar erros/warnings
```

### 4. Processamento
```
1. Com importação "Validada", clicar no ícone de play (▶️)
2. Ou no preview, clicar "Processar Importação"
3. Aguardar processamento em background
4. Status muda para "Concluído"
```

## Integração com Backend

### Endpoints Utilizados

```typescript
// Upload
POST /api/v1/import/upload

// Validação
POST /api/v1/import/validate/{import_id}

// Preview
POST /api/v1/import/preview

// Processamento
POST /api/v1/import/process/{import_id}

// Listagem
GET /api/v1/import/imports

// Estatísticas
GET /api/v1/import/statistics

// Exclusão
DELETE /api/v1/import/imports/{import_id}
```

### Autenticação

- **JWT Token** armazenado no `localStorage`
- **Header Authorization**: `Bearer {token}`
- **Interceptação automática** de erro 401
- **Limpeza automática** de token expirado

## Formatação de Dados

### Tradução de Colunas
```typescript
const translations = {
  'name': 'Nome',
  'email': 'E-mail',
  'document': 'CPF/CNPJ',
  'phone': 'Telefone',
  'address': 'Endereço',
  'city': 'Cidade',
  'state': 'Estado',
  'zip_code': 'CEP',
  'company': 'Empresa',
  'role': 'Perfil',
  'points': 'Pontos',
  'value': 'Valor',
  'description': 'Descrição',
  'date': 'Data',
  'status': 'Status'
};
```

### Formatação de Valores
- **Datas**: Formato brasileiro
- **Valores monetários**: R$ com 2 casas decimais
- **CPF**: XXX.XXX.XXX-XX
- **CNPJ**: XX.XXX.XXX/XXXX-XX
- **Telefone**: (XX) XXXXX-XXXX

## Estados da Interface

### Loading States
- **Upload**: Progress bar animada
- **Listagem**: Spinner com texto
- **Preview**: Loading específico
- **Processamento**: Botões desabilitados

### Status Badges
- **Pendente**: Cinza
- **Validando**: Azul
- **Validado**: Verde
- **Processando**: Azul
- **Concluído**: Verde
- **Falhou**: Vermelho

## Tratamento de Erros

### Tipos de Erro
1. **Arquivo inválido**: Formato não suportado
2. **Upload falhou**: Problema de rede/servidor
3. **Validação falhou**: Dados inconsistentes
4. **Processamento falhou**: Erro no backend
5. **Token expirado**: Redirecionamento automático

### Feedback ao Usuário
- **Toasts** informativos para sucesso
- **Toasts** de erro com detalhes
- **Confirmações** para ações destrutivas
- **Estados visuais** claros

## Responsividade

### Breakpoints
- **Mobile**: Layout em coluna única
- **Tablet**: Grid 2 colunas
- **Desktop**: Grid 4 colunas para estatísticas

### Componentes Adaptativos
- **Tabelas**: Scroll horizontal
- **Cards**: Layout flexível
- **Botões**: Tamanhos responsivos

## Performance

### Otimizações
- **Lazy loading** de dados
- **Debounce** em filtros
- **Memoização** de componentes pesados
- **Chunking** de requisições

### Monitoramento
- **Console logs** para debug
- **Error boundaries** para captura de erros
- **Performance metrics** básicas

## Configuração

### Variáveis de Ambiente
```env
VITE_BACKEND_URL=http://localhost:8000
```

### Dependências
```json
{
  "@radix-ui/react-tabs": "^1.1.0",
  "@radix-ui/react-select": "^2.1.1",
  "@radix-ui/react-textarea": "^1.1.0",
  "lucide-react": "^0.462.0"
}
```

## Próximos Passos

### Melhorias Planejadas
1. **Drag & Drop** para upload
2. **Upload múltiplo** de arquivos
3. **Templates** de importação
4. **Agendamento** de importações
5. **Relatórios** detalhados
6. **Exportação** de dados processados

### Integrações Futuras
1. **WebSocket** para atualizações em tempo real
2. **Notificações** push
3. **Auditoria** completa
4. **Backup** automático

## Troubleshooting

### Problemas Comuns

1. **Arquivo não carrega**
   - Verificar formato suportado
   - Verificar tamanho máximo
   - Verificar conexão com backend

2. **Preview não aparece**
   - Verificar se importação foi validada
   - Verificar logs do console
   - Verificar permissões do usuário

3. **Processamento falha**
   - Verificar dados no preview
   - Verificar logs do backend
   - Verificar mapeamento de colunas

### Logs de Debug
```typescript
// Habilitar logs detalhados
console.log('Upload response:', response);
console.log('Preview data:', previewData);
console.log('Processing status:', status);
```

## Conclusão

O novo sistema de importação oferece uma experiência completa e profissional, integrando perfeitamente com a engine híbrida do backend. A interface é intuitiva, responsiva e oferece todas as funcionalidades necessárias para um sistema de importação robusto. 