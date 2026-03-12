# Sistema de Ativação de Inquilinos

Documento único: planejamento, fluxo e referência a exemplos de código. Sanitização 14/02/2026 (consolidado de PLANEJAMENTO_ATIVACAO_INQUILINOS, RESUMO_ATIVACAO_INQUILINOS, EXEMPLOS_CODIGO_ATIVACAO).

---

## Objetivo

Sistema de convite e ativação para inquilinos: link único ou envio massivo de e-mails; inquilino define sua própria senha em formulário pré-preenchido.

---

## Fluxo resumido

**Admin:** Gera link individual ou envia convites em massa → token gerado, status "convidado" → e-mail com link (expira 7 dias).  
**Inquilino:** Clica no link → valida token (+ CPF opcional) → formulário com dados pré-preenchidos → define senha → conta ativada.

---

## Requisitos funcionais

- **Link de convite:** botão copiar link; token uso único; expiração (ex.: 7 dias).
- **Envio em massa:** checkboxes, "Select All", botão "Enviar Convites", modal de confirmação.
- **Formulário de ativação:** link único, campos pré-preenchidos, campo senha, validação de token.
- **Status:** Convidado, Sem Senha, Pendente, Ativo.

---

## Estrutura de dados

- **users:** `activation_token`, `activation_token_expires_at`, `invited_at`, `invitation_sent_count`, `activated_at`.
- **invitation_logs:** user_id, invitation_type, sent_by_user_id, sent_at, email_sent_to, token_used, token_used_at, ip_address, user_agent.

---

## API (resumo)

- `POST /admin/users/{user_id}/generate-activation-link`
- Endpoints de envio em massa e ativação (validar token, definir senha). Base: `/admin/tenants` ou `/admin/users`.

---

## Exemplos de código

Backend: migration (activation_token, invitation_logs), models, service, routes.  
Frontend: modificações em Participantes (botão link, seleção múltipla, modal), componente de Ativação (formulário por link).  
Template de e-mail para convite.

*Código completo estava em EXEMPLOS_CODIGO_ATIVACAO.md; ver histórico git se necessário.*
