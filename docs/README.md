# PonTua+ Pontos Platform Documentation

## 🧠 Project Objective
PonTua+ is a pontos platform tailored for the real estate sector. This project involves migrating the validated MVP from an Excel/VBA version to a multi-user web application with a real backend. The architecture follows the MVC (Model-View-Controller) pattern, focusing on modularity, responsiveness, real CRUDs, and future expansion (marketplace, whitelabel, etc).

## 👤 Profiles and Personalized Menus
The application navigation is structured by user profiles with specific menus:

- **Admin**: Unrestricted access, global view, 16 menus including dashboards, entity management, manual entries, marketplace, imports, and withdrawal control.
- **Provider**: Manages users, properties, pontos programs, and restricted products. CRUDs are limited to their context.
- **User**: Tracks transactions and pontos balance, can use credits in the provider's store and the open marketplace.
- **Seller**: Publishes products in the open marketplace, tracks sales, and requests withdrawals.

## 📦 Data Modeling
The relational database structure includes:

- `CadastroEntidade`, `CadastroConta`, `CadastroImovel`, `CadastroServico`
- `CadastroPontos`, `CadastroServicoPontos`
- `RegistroPagamentos`, `RegistroPontos`, `RegistroExtrato`
- `CadastroProdutoServicoMarketplace`, `SolicitacaoSaque`

All relationships are implemented with UUID control, context control by `IdProvedor`, and tracking fields (creation, update, logical deletion).

## 🔁 Import and Automatic Processing
Critical system functionality:

- Imports `.xlsx` files (Admin and Provider only)
- Expands data into a standardized structure
- Automatically registers entities, properties, services, and accounts
- Creates `RegistroPagamentos` avoiding duplication
- Automatically generates `RegistroPontos` (only for services of type "Rent")
- Updates `RegistroExtrato` with pontos, fee, and rebate
- Calculates account balances in real-time

## 📊 Complete Screens and Functionalities
Nine main screens with real CRUD and profile-based filters:

1. **Participants (CadastroEntidade)**: Global CRUD (Admin), filtered by `IdProvedor` (Provider).
2. **Accounts (CadastroConta)**: CRUD with dynamic balance by statement.
3. **Properties (CadastroImovel)**: Visible to Admin and Provider, with filters by tenant, type, and city.
4. **Services (CadastroServico)**: Service registration (e.g., rent) linked to property and participants.
5. **Pontos (CadastroPontos)**: Programs created by Admin or Provider with custom rules.
6. **Pontos Links (CadastroServicoPontos)**: Connection between services and programs.
7. **Transactions (RegistroPagamentos)**: CRUD with status, due date, and profile-based filters.
8. **Generated Pontoss (RegistroPontos)**: Complete CRUD, linked to payments and programs.
9. **Statement (RegistroExtrato)**: Financial movement by account with advanced filters.

## 🛒 Marketplace Expansion
The scope includes the commercialization of products and services with pontos:

- `CadastroProdutoServicoMarketplace`: Product registration (type: open/restricted), visible by profile.
- "Use Pontos" screen with two tabs:
  - Private Store (provider's services)
  - Open Marketplace (seller's products)
- Complete purchase functionality with balance verification, statement generation, and KPI updates.

## 🔐 Login, Registration, and Security
The initial screen includes:

- Login with fictitious examples by profile (no password)
- Pre-login registration divided into:
  - Profile selection (User, Provider, Seller)
  - Dynamic form
  - Terms acceptance (User only)
  - Pre-existing balance verification by CPF
- Automatic redirection to login after registration

## ✅ Critical Fixes and Adjustments
During development, several bugs were resolved with targeted actions, such as:

- **TypeScript Typing Errors**: Fixed union types, missing props, and inconsistent interfaces.
- **Layout Issues**: Adjusted z-index, overflow, modal scrolling, and mobile responsiveness.
- **Disappearing Menus**: Restored all menus by profile with correct order and filters.
- **Incomplete CRUDs**: Ensured real functionality for:
  - Products and services (Admin, Provider, Seller)
  - Withdrawal requests
  - Manual entries (Admin)
  - Pontos and users linked to Provider
- **"Use Pontos" Screen Usability**: Fixed broken grid on mobile

## 📌 Technical and Visual Considerations
- Clean and responsive design inspired by financial platforms like Nubank/Inter
- Tailwind CSS with color scheme:
  - Primary: `#ff953d`
  - Secondary: `#4377a4`
  - Accent: `#ffc47d`
- Dynamic KPIs by profile (e.g., delinquency, total pontos, balance by type)
- Feedback toasts for success and error
- Forms with validation, loading, empty state, and error handling

## 🧩 Next Steps and Modularity
The structure is ready for expansion with:

- Whitelabel control by real estate agency or provider
- Analytical dashboard
- External integrations (e.g., Veriff, ERPs)
- Automated withdrawal routines and payment split
