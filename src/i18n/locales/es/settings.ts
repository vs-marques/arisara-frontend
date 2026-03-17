export default {
  // Página Settings - Header
  header: {
    breadcrumb: 'Configuración',
    title: 'Perfil',
    subtitle: 'Administre su información personal, seguridad y sesiones activas',
  },

  // ProfileSection - Información Personal
  profile: {
    avatar: {
      changePhoto: 'Cambiar Foto',
      uploading: 'Enviando...',
      hint: 'JPEG, PNG o WebP (máx. 5MB)',
    },
    personalInfo: {
      title: 'Información Personal',
      subtitle: 'Datos básicos de su cuenta',
      fields: {
        fullName: 'Nombre Completo',
        profile: 'Perfil',
        cpf: 'CPF',
        birthDate: 'Fecha de Nacimiento',
      },
      placeholders: {
        user: 'Usuario',
      },
      hints: {
        locked: 'Este campo no puede ser modificado',
        birthDateOnce: 'Sólo se puede establecer una vez',
        birthDateLocked: 'Fecha establecida y bloqueada para edición',
      },
    },
    contactInfo: {
      title: 'Información de Contacto',
      subtitle: 'Correo electrónico y teléfono de contacto',
      fields: {
        currentEmail: 'Correo Electrónico Actual',
        newEmail: 'Nuevo Correo Electrónico',
        verificationCode: 'Código de Verificación',
        phone: 'Teléfono',
      },
      placeholders: {
        newEmail: 'nuevo@email.com',
        phone: '(11) 98765-4321',
        verificationCode: 'Ingrese el código de 8 dígitos',
      },
      hints: {
        emailChangeInfo: 'Para cambiar el correo electrónico, use el formulario a continuación',
        verificationSent: 'Se enviará un código de verificación a su correo electrónico actual ({{email}})',
        codeSentTo: 'Código enviado a: {{email}}',
        newEmailIs: 'Nuevo correo electrónico: {{email}}',
      },
      buttons: {
        requestChange: 'Solicitar Cambio',
        requesting: 'Enviando...',
        verify: 'Verificar y Cambiar',
        verifying: 'Verificando...',
        cancel: 'Cancelar',
        savePhone: 'Guardar Teléfono',
        saving: 'Guardando...',
      },
    },
    birthDateDialog: {
      title: 'Confirmar Fecha de Nacimiento',
      description: 'Esta acción es <strong>IRREVERSIBLE</strong>. Después de confirmar, no podrá cambiar su fecha de nacimiento nuevamente.',
      buttons: {
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        confirming: 'Confirmando...',
      },
    },
    toasts: {
      phoneUpdated: '¡Teléfono actualizado con éxito!',
      verificationSent: '¡Código de verificación enviado al nuevo correo electrónico!',
      emailUpdated: '¡Correo electrónico actualizado con éxito!',
      birthDateSet: '¡Fecha de nacimiento establecida con éxito!',
      enterNewEmail: 'Ingrese el nuevo correo electrónico',
      emailMustDiffer: 'El nuevo correo electrónico debe ser diferente del actual',
      enterVerificationCode: 'Ingrese el código de verificación',
      selectBirthDate: 'Seleccione una fecha de nacimiento',
      errorLoadingProfile: 'Error al cargar perfil',
      errorUpdatingProfile: 'Error al actualizar perfil',
      errorRequestingEmailChange: 'Error al solicitar cambio de correo electrónico',
      errorVerifyingCode: 'Error al verificar código',
      errorUpdatingBirthDate: 'Error al actualizar fecha de nacimiento',
    },
  },

  // SecuritySection - Seguridad
  security: {
    mfa: {
      title: 'Autenticación Multi-Factor (MFA)',
      subtitle: 'Agregue una capa adicional de seguridad a su cuenta',
      toggle: {
        label: 'Activar MFA por Correo Electrónico',
        description: 'Reciba códigos de verificación en su correo electrónico en cada inicio de sesión',
      },
      status: {
        enabled: 'MFA Activado',
        enabledDescription: 'Su cuenta está protegida con autenticación de dos factores',
      },
      dialog: {
        titleEnable: 'Activar MFA',
        titleDisable: 'Desactivar MFA',
        descriptionEnable: 'Al activar MFA, recibirá un código de verificación por correo electrónico en cada inicio de sesión.',
        descriptionDisable: 'Al desactivar MFA, su cuenta estará menos segura. ¿Está seguro?',
        buttons: {
          cancel: 'Cancelar',
          confirm: 'Confirmar',
          confirming: 'Espere...',
        },
      },
      toasts: {
        enabled: '¡MFA activado con éxito!',
        disabled: '¡MFA desactivado con éxito!',
        error: 'Error al cambiar MFA',
        errorLoading: 'Error al cargar configuración de seguridad',
      },
    },
    password: {
      title: 'Cambiar Contraseña',
      subtitle: 'Cambie su contraseña de acceso',
      fields: {
        currentPassword: 'Contraseña Actual',
        newPassword: 'Nueva Contraseña',
        confirmPassword: 'Confirmar Nueva Contraseña',
      },
      placeholders: {
        currentPassword: 'Ingrese su contraseña actual',
        newPassword: 'Ingrese su nueva contraseña',
        confirmPassword: 'Ingrese nuevamente su nueva contraseña',
      },
      strength: {
        weak: 'Débil',
        medium: 'Media',
        strong: 'Fuerte',
      },
      errors: {
        passwordsDoNotMatch: 'Las contraseñas no coinciden',
        enterCurrentPassword: 'Ingrese su contraseña actual',
      },
      buttons: {
        change: 'Cambiar Contraseña',
        changing: 'Cambiando...',
      },
      toasts: {
        changed: '¡Contraseña cambiada con éxito!',
        error: 'Error al cambiar contraseña',
      },
    },
  },

  // SessionsSection - Sesiones
  sessions: {
    title: 'Sesiones Activas',
    subtitle: 'Dispositivos donde está conectado',
    currentSession: 'Sesión Actual',
    noSessions: 'No se encontraron sesiones activas',
    created: 'Creada',
    timeAgo: {
      now: 'Ahora mismo',
      minutes: 'Hace {{count}} min',
      hours: 'Hace {{count}}h',
      days: 'Hace {{count}}d',
      unknown: 'Desconocido',
    },
    securityTip: {
      title: 'Consejo de Seguridad',
      description: 'Si no reconoce alguna de estas sesiones, revóquela inmediatamente y cambie su contraseña.',
    },
    buttons: {
      revokeAll: 'Revocar Todas',
      revoke: 'Revocar',
      revoking: 'Revocando...',
    },
    revokeDialog: {
      title: 'Revocar Sesión',
      description: 'Esta acción desconectará este dispositivo. Deberá iniciar sesión nuevamente para acceder a él.',
      buttons: {
        cancel: 'Cancelar',
        revoke: 'Revocar',
        revoking: 'Revocando...',
      },
    },
    revokeAllDialog: {
      title: 'Revocar Todas las Sesiones',
      description: 'Esta acción desconectará todos los demás dispositivos, manteniendo solo la sesión actual. ¿Está seguro?',
      buttons: {
        cancel: 'Cancelar',
        revokeAll: 'Revocar Todas',
        revoking: 'Revocando...',
      },
    },
    toasts: {
      revoked: '¡Sesión revocada con éxito!',
      cannotRevokeCurrent: 'No es posible revocar la sesión actual',
      error: 'Error al cargar sesiones',
      errorRevoking: 'Error al revocar sesión',
      errorRevokingAll: 'Error al revocar sesiones',
    },
  },

  // AvailabilitySection - Horarios de atencion y agendamiento (§3.2.2)
  availability: {
    title: 'Disponibilidad',
    subtitle: 'Define cuando están disponibles el equipo humano y Arisara y en qué horarios se puede agendar.',
    humanTitle: 'Atención humana',
    humanDesc: 'Horario en que los operadores están disponibles. Se usa en el enrutamiento para decidir cuándo derivar al humano.',
    agentTitle: 'Atención Arisara (agente)',
    agentDesc: 'Horario en que la agente de IA puede atender. Evita solapamiento con el horario del operador.',
    schedulingTitle: 'Horarios para agendar',
    schedulingDesc: 'Cuando el lead puede agendar. Independiente de quien atienda.',
    timezone: 'Zona horaria',
    byDay: 'Por día de la semana',
    days: {
      mon: 'Lun',
      tue: 'Mar',
      wed: 'Mie',
      thu: 'Jue',
      fri: 'Vie',
      sat: 'Sab',
      sun: 'Dom',
    },
    closed: 'Cerrado',
    open: 'Abierto',
    toggle24x7: 'Atención 24x7',
    toggle24x7On: 'Agente disponible 24 horas',
    toggle24x7Off: 'Usar horarios por día',
    toggleOutsideOperator: 'Fuera del horario del operador',
    toggleOutsideOperatorOn: 'La agente solo cuando el humano está cerrado',
    toggleOutsideOperatorOff: 'Definir horario propio',
    slotDuration: 'Duración predeterminada del agendamiento',
    slotDurationHint: 'Cada slot tendrá esta duración (15 a 60 min).',
    maxBookings: 'Máx. agendamientos en el mismo horario',
    maxBookingsHint: 'Cuántos agendamientos caben en el mismo slot (1 a 10).',
    save: 'Guardar',
    saving: 'Guardando...',
    toasts: {
      saved: 'Disponibilidad guardada correctamente.',
      saveError: 'Error al guardar. Intente de nuevo.',
      selectCompany: 'Seleccione una empresa.',
    },
  },

  // Common - Elementos comunes
  common: {
    loading: 'Cargando...',
    error: 'Error',
    errorLoadingData: 'Error al cargar datos',
    language: 'Idioma',
    languageOption_pt: 'Português',
    languageOption_en: 'English',
    languageOption_es: 'Español',
  },
};
