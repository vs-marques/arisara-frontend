export default {
  // Página Settings - Header
  header: {
    breadcrumb: 'Configurações',
    title: 'Perfil',
    subtitle: 'Gerencie suas informações pessoais, segurança e sessões ativas',
  },

  // ProfileSection - Informações Pessoais
  profile: {
    avatar: {
      changePhoto: 'Alterar Foto',
      uploading: 'Enviando...',
      hint: 'JPEG, PNG ou WebP (máx. 5MB)',
    },
    personalInfo: {
      title: 'Informações Pessoais',
      subtitle: 'Dados básicos do seu cadastro',
      fields: {
        fullName: 'Nome Completo',
        profile: 'Perfil',
        cpf: 'CPF',
        birthDate: 'Data de Nascimento',
      },
      placeholders: {
        user: 'Usuário',
      },
      hints: {
        locked: 'Este campo não pode ser alterado',
        birthDateOnce: 'Pode ser definida apenas uma vez',
        birthDateLocked: 'Data definida e bloqueada para edição',
      },
    },
    contactInfo: {
      title: 'Informações de Contato',
      subtitle: 'Email e telefone para contato',
      fields: {
        currentEmail: 'Email Atual',
        newEmail: 'Novo Email',
        verificationCode: 'Código de Verificação',
        phone: 'Telefone',
      },
      placeholders: {
        newEmail: 'novo@email.com',
        phone: '(11) 98765-4321',
        verificationCode: 'Digite o código de 8 dígitos',
      },
      hints: {
        emailChangeInfo: 'Para alterar o email, use o formulário abaixo',
        verificationSent: 'Um código de verificação será enviado para o seu email atual ({{email}})',
        codeSentTo: 'Código enviado para: {{email}}',
        newEmailIs: 'Novo email: {{email}}',
      },
      buttons: {
        requestChange: 'Solicitar Alteração',
        requesting: 'Enviando...',
        verify: 'Verificar e Alterar',
        verifying: 'Verificando...',
        cancel: 'Cancelar',
        savePhone: 'Salvar Telefone',
        saving: 'Salvando...',
      },
    },
    birthDateDialog: {
      title: 'Confirmar Data de Nascimento',
      description: 'Esta ação é <strong>IRREVERSÍVEL</strong>. Após confirmar, você não poderá alterar sua data de nascimento novamente.',
      buttons: {
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        confirming: 'Confirmando...',
      },
    },
    toasts: {
      phoneUpdated: 'Telefone atualizado com sucesso!',
      verificationSent: 'Código de verificação enviado para o novo email!',
      emailUpdated: 'Email atualizado com sucesso!',
      birthDateSet: 'Data de nascimento definida com sucesso!',
      enterNewEmail: 'Digite o novo email',
      emailMustDiffer: 'O novo email deve ser diferente do atual',
      enterVerificationCode: 'Digite o código de verificação',
      selectBirthDate: 'Selecione uma data de nascimento',
      errorLoadingProfile: 'Erro ao carregar perfil',
      errorUpdatingProfile: 'Erro ao atualizar perfil',
      errorRequestingEmailChange: 'Erro ao solicitar mudança de email',
      errorVerifyingCode: 'Erro ao verificar código',
      errorUpdatingBirthDate: 'Erro ao atualizar data de nascimento',
    },
  },

  // SecuritySection - Segurança
  security: {
    mfa: {
      title: 'Autenticação Multi-Fator (MFA)',
      subtitle: 'Adicione uma camada extra de segurança à sua conta',
      toggle: {
        label: 'Ativar MFA por Email',
        description: 'Receba códigos de verificação no seu email a cada login',
      },
      status: {
        enabled: 'MFA Ativado',
        enabledDescription: 'Sua conta está protegida com autenticação de dois fatores',
      },
      dialog: {
        titleEnable: 'Ativar MFA',
        titleDisable: 'Desativar MFA',
        descriptionEnable: 'Ao ativar o MFA, você receberá um código de verificação por email a cada login.',
        descriptionDisable: 'Ao desativar o MFA, sua conta ficará menos segura. Tem certeza?',
        buttons: {
          cancel: 'Cancelar',
          confirm: 'Confirmar',
          confirming: 'Aguarde...',
        },
      },
      toasts: {
        enabled: 'MFA ativado com sucesso!',
        disabled: 'MFA desativado com sucesso!',
        error: 'Erro ao alterar MFA',
        errorLoading: 'Erro ao carregar configurações de segurança',
      },
    },
    password: {
      title: 'Alterar Senha',
      subtitle: 'Altere sua senha de acesso',
      fields: {
        currentPassword: 'Senha Atual',
        newPassword: 'Nova Senha',
        confirmPassword: 'Confirmar Nova Senha',
      },
      placeholders: {
        currentPassword: 'Digite sua senha atual',
        newPassword: 'Digite sua nova senha',
        confirmPassword: 'Digite novamente sua nova senha',
      },
      strength: {
        weak: 'Fraca',
        medium: 'Média',
        strong: 'Forte',
      },
      errors: {
        passwordsDoNotMatch: 'As senhas não coincidem',
        enterCurrentPassword: 'Digite sua senha atual',
      },
      buttons: {
        change: 'Alterar Senha',
        changing: 'Alterando...',
      },
      toasts: {
        changed: 'Senha alterada com sucesso!',
        error: 'Erro ao alterar senha',
      },
    },
  },

  // SessionsSection - Sessões
  sessions: {
    title: 'Sessões Ativas',
    subtitle: 'Dispositivos onde você está conectado',
    currentSession: 'Sessão Atual',
    noSessions: 'Nenhuma sessão ativa encontrada',
    created: 'Criada',
    timeAgo: {
      now: 'Agora mesmo',
      minutes: 'Há {{count}} min',
      hours: 'Há {{count}}h',
      days: 'Há {{count}}d',
      unknown: 'Desconhecido',
    },
    securityTip: {
      title: 'Dica de Segurança',
      description: 'Se você não reconhece alguma dessas sessões, revogue-a imediatamente e altere sua senha.',
    },
    buttons: {
      revokeAll: 'Revogar Todas',
      revoke: 'Revogar',
      revoking: 'Revogando...',
    },
    revokeDialog: {
      title: 'Revogar Sessão',
      description: 'Esta ação irá desconectar este dispositivo. Você precisará fazer login novamente para acessá-lo.',
      buttons: {
        cancel: 'Cancelar',
        revoke: 'Revogar',
        revoking: 'Revogando...',
      },
    },
    revokeAllDialog: {
      title: 'Revogar Todas as Sessões',
      description: 'Esta ação irá desconectar todos os outros dispositivos, mantendo apenas a sessão atual. Tem certeza?',
      buttons: {
        cancel: 'Cancelar',
        revokeAll: 'Revogar Todas',
        revoking: 'Revogando...',
      },
    },
    toasts: {
      revoked: 'Sessão revogada com sucesso!',
      cannotRevokeCurrent: 'Não é possível revogar a sessão atual',
      error: 'Erro ao carregar sessões',
      errorRevoking: 'Erro ao revogar sessão',
      errorRevokingAll: 'Erro ao revogar sessões',
    },
  },

  // Common - Elementos comuns
  common: {
    loading: 'Carregando...',
    error: 'Erro',
    errorLoadingData: 'Erro ao carregar dados',
    language: 'Idioma',
    languageOption_pt: 'Português',
    languageOption_en: 'English',
    languageOption_es: 'Español',
  },
};
