# Database Structure

## Tables and Relationships

### CadastroEntidade
- **Description**: Entity registration (e.g., users, providers, sellers)
- **Fields**:
  - `id` (UUID, Primary Key)
  - `name`
  - `type` (User, Provider, Seller)
  - `created_at`, `updated_at`, `deleted_at`

### CadastroConta
- **Description**: Account registration
- **Fields**:
  - `id` (UUID, Primary Key)
  - `entity_id` (Foreign Key to CadastroEntidade)
  - `balance`
  - `created_at`, `updated_at`, `deleted_at`

### CadastroImovel
- **Description**: Property registration
- **Fields**:
  - `id` (UUID, Primary Key)
  - `provider_id` (Foreign Key to CadastroEntidade)
  - `tenant_id` (Foreign Key to CadastroEntidade)
  - `type`, `city`
  - `created_at`, `updated_at`, `deleted_at`

### CadastroServico
- **Description**: Service registration (e.g., rent)
- **Fields**:
  - `id` (UUID, Primary Key)
  - `property_id` (Foreign Key to CadastroImovel)
  - `provider_id` (Foreign Key to CadastroEntidade)
  - `type`
  - `created_at`, `updated_at`, `deleted_at`

### CadastroPontos
- **Description**: Pontos program registration
- **Fields**:
  - `id` (UUID, Primary Key)
  - `provider_id` (Foreign Key to CadastroEntidade)
  - `rules`
  - `created_at`, `updated_at`, `deleted_at`

### CadastroServicoPontos
- **Description**: Links services to pontos programs
- **Fields**:
  - `id` (UUID, Primary Key)
  - `service_id` (Foreign Key to CadastroServico)
  - `pontos_id` (Foreign Key to CadastroPontos)
  - `created_at`, `updated_at`, `deleted_at`

### RegistroPagamentos
- **Description**: Payment records
- **Fields**:
  - `id` (UUID, Primary Key)
  - `account_id` (Foreign Key to CadastroConta)
  - `amount`, `status`, `due_date`
  - `created_at`, `updated_at`, `deleted_at`

### RegistroPontos
- **Description**: Generated pontos records
- **Fields**:
  - `id` (UUID, Primary Key)
  - `payment_id` (Foreign Key to RegistroPagamentos)
  - `pontos_id` (Foreign Key to CadastroPontos)
  - `amount`
  - `created_at`, `updated_at`, `deleted_at`

### RegistroExtrato
- **Description**: Account statement records
- **Fields**:
  - `id` (UUID, Primary Key)
  - `account_id` (Foreign Key to CadastroConta)
  - `type` (credit/debit)
  - `amount`
  - `created_at`, `updated_at`, `deleted_at`

### CadastroProdutoServicoMarketplace
- **Description**: Marketplace product/service registration
- **Fields**:
  - `id` (UUID, Primary Key)
  - `seller_id` (Foreign Key to CadastroEntidade)
  - `type` (open/restricted)
  - `price`
  - `created_at`, `updated_at`, `deleted_at`

### SolicitacaoSaque
- **Description**: Withdrawal requests
- **Fields**:
  - `id` (UUID, Primary Key)
  - `account_id` (Foreign Key to CadastroConta)
  - `amount`
  - `status`
  - `created_at`, `updated_at`, `deleted_at`

## Key Features
- **UUID Control**: Ensures unique identification across all tables.
- **Context Control**: Filters by `IdProvedor` for multi-tenancy.
- **Tracking Fields**: `created_at`, `updated_at`, `deleted_at` for auditing and logical deletion.
