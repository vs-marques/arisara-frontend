# Controle de visibilidade por roles e ACL

Documento único: visibilidade por perfil e guia de verificação. Sanitização 14/02/2026 (consolidado de CONTROLE_VISIBILIDADE_ROLES e GUIA_VERIFICACAO_ROLES).

---

## Objetivos

Garantir que cada perfil (role) acesse apenas o que cabe ao seu contexto:

- **Provider/Imobiliária:** gestão de inquilinos, proprietários, imóveis, transações.
- **Consumer/Inquilino:** finanças pessoais e marketplace.
- **Superadmin:** acesso total.
- **Supplier/Vendedor:** gestão de produtos e serviços.

---

## Alterações implementadas

- **Sidebar:** itens por role (Provider: Inquilinos, Proprietários, Imóveis, Finanças, Importação, Programas de Pontos; Consumer: Finanças, Loja).
- **ProtectedRoute:** propriedade `allowedRoles`; redirecionamento ao dashboard quando sem permissão; tipo `Role`.
- **Rotas:** participantes, proprietários, imóveis, financial-dashboard, importacao-excel, programas-pontos (Provider); marketplace (Consumer).

---

## Checklist de verificação

### Provider
- **Visível:** Dashboard, Perfil, Inquilinos, Proprietários, Imóveis, Finanças, Importação de Transações, Programas de Pontos.
- **Não visível:** Administradores, Provedores, Vendedores, Loja, Assinaturas, Contas.
- **URLs permitidas:** /dashboard, /perfil, /participantes, /proprietarios, /imoveis, /financial-dashboard, /importacao-excel, /programas-pontos.  
- **Bloqueadas (→ /dashboard):** /administrators, /provedores, /vendedores, /contas, /subscriptions, /marketplace, /produtos-servicos.

### Consumer
- **Visível:** Dashboard, Perfil, Finanças, Loja.
- **Não visível:** Inquilinos, Proprietários, Imóveis, Importação, Programas de Pontos, Administradores, etc.
- **URLs permitidas:** /dashboard, /perfil, /financial-dashboard, /marketplace.  
- **Bloqueadas:** /participantes, /proprietarios, /imoveis, etc.

*(Checklists completos para Superadmin e Supplier estavam nos documentos originais; ver histórico git.)*
