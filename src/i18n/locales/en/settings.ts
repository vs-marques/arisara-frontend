export default {
  // Settings Page - Header
  header: {
    breadcrumb: 'Settings',
    title: 'Profile',
    subtitle: 'Manage your personal information, security and active sessions',
  },

  // ProfileSection - Personal Information
  profile: {
    avatar: {
      changePhoto: 'Change Photo',
      uploading: 'Uploading...',
      hint: 'JPEG, PNG or WebP (max. 5MB)',
    },
    personalInfo: {
      title: 'Personal Information',
      subtitle: 'Basic account data',
      fields: {
        fullName: 'Full Name',
        profile: 'Profile',
        cpf: 'CPF',
        birthDate: 'Date of Birth',
      },
      placeholders: {
        user: 'User',
      },
      hints: {
        locked: 'This field cannot be changed',
        birthDateOnce: 'Can only be set once',
        birthDateLocked: 'Date set and locked for editing',
      },
    },
    contactInfo: {
      title: 'Contact Information',
      subtitle: 'Email and phone for contact',
      fields: {
        currentEmail: 'Current Email',
        newEmail: 'New Email',
        verificationCode: 'Verification Code',
        phone: 'Phone',
      },
      placeholders: {
        newEmail: 'new@email.com',
        phone: '(11) 98765-4321',
        verificationCode: 'Enter the 8-digit code',
      },
      hints: {
        emailChangeInfo: 'To change email, use the form below',
        verificationSent: 'A verification code will be sent to your current email ({{email}})',
        codeSentTo: 'Code sent to: {{email}}',
        newEmailIs: 'New email: {{email}}',
      },
      buttons: {
        requestChange: 'Request Change',
        requesting: 'Sending...',
        verify: 'Verify and Change',
        verifying: 'Verifying...',
        cancel: 'Cancel',
        savePhone: 'Save Phone',
        saving: 'Saving...',
      },
    },
    birthDateDialog: {
      title: 'Confirm Date of Birth',
      description: 'This action is <strong>IRREVERSIBLE</strong>. After confirming, you will not be able to change your date of birth again.',
      buttons: {
        cancel: 'Cancel',
        confirm: 'Confirm',
        confirming: 'Confirming...',
      },
    },
    toasts: {
      phoneUpdated: 'Phone updated successfully!',
      verificationSent: 'Verification code sent to new email!',
      emailUpdated: 'Email updated successfully!',
      birthDateSet: 'Date of birth set successfully!',
      enterNewEmail: 'Enter new email',
      emailMustDiffer: 'New email must be different from current',
      enterVerificationCode: 'Enter verification code',
      selectBirthDate: 'Select a date of birth',
      errorLoadingProfile: 'Error loading profile',
      errorUpdatingProfile: 'Error updating profile',
      errorRequestingEmailChange: 'Error requesting email change',
      errorVerifyingCode: 'Error verifying code',
      errorUpdatingBirthDate: 'Error updating date of birth',
    },
  },

  // SecuritySection - Security
  security: {
    mfa: {
      title: 'Multi-Factor Authentication (MFA)',
      subtitle: 'Add an extra layer of security to your account',
      toggle: {
        label: 'Enable Email MFA',
        description: 'Receive verification codes in your email at each login',
      },
      status: {
        enabled: 'MFA Enabled',
        enabledDescription: 'Your account is protected with two-factor authentication',
      },
      dialog: {
        titleEnable: 'Enable MFA',
        titleDisable: 'Disable MFA',
        descriptionEnable: 'By enabling MFA, you will receive a verification code via email at each login.',
        descriptionDisable: 'By disabling MFA, your account will be less secure. Are you sure?',
        buttons: {
          cancel: 'Cancel',
          confirm: 'Confirm',
          confirming: 'Please wait...',
        },
      },
      toasts: {
        enabled: 'MFA enabled successfully!',
        disabled: 'MFA disabled successfully!',
        error: 'Error changing MFA',
        errorLoading: 'Error loading security settings',
      },
    },
    password: {
      title: 'Change Password',
      subtitle: 'Change your access password',
      fields: {
        currentPassword: 'Current Password',
        newPassword: 'New Password',
        confirmPassword: 'Confirm New Password',
      },
      placeholders: {
        currentPassword: 'Enter your current password',
        newPassword: 'Enter your new password',
        confirmPassword: 'Re-enter your new password',
      },
      strength: {
        weak: 'Weak',
        medium: 'Medium',
        strong: 'Strong',
      },
      errors: {
        passwordsDoNotMatch: 'Passwords do not match',
        enterCurrentPassword: 'Enter your current password',
      },
      buttons: {
        change: 'Change Password',
        changing: 'Changing...',
      },
      toasts: {
        changed: 'Password changed successfully!',
        error: 'Error changing password',
      },
    },
  },

  // SessionsSection - Sessions
  sessions: {
    title: 'Active Sessions',
    subtitle: 'Devices where you are logged in',
    currentSession: 'Current Session',
    noSessions: 'No active sessions found',
    created: 'Created',
    timeAgo: {
      now: 'Just now',
      minutes: '{{count}} min ago',
      hours: '{{count}}h ago',
      days: '{{count}}d ago',
      unknown: 'Unknown',
    },
    securityTip: {
      title: 'Security Tip',
      description: 'If you don\'t recognize any of these sessions, revoke it immediately and change your password.',
    },
    buttons: {
      revokeAll: 'Revoke All',
      revoke: 'Revoke',
      revoking: 'Revoking...',
    },
    revokeDialog: {
      title: 'Revoke Session',
      description: 'This action will disconnect this device. You will need to log in again to access it.',
      buttons: {
        cancel: 'Cancel',
        revoke: 'Revoke',
        revoking: 'Revoking...',
      },
    },
    revokeAllDialog: {
      title: 'Revoke All Sessions',
      description: 'This action will disconnect all other devices, keeping only the current session. Are you sure?',
      buttons: {
        cancel: 'Cancel',
        revokeAll: 'Revoke All',
        revoking: 'Revoking...',
      },
    },
    toasts: {
      revoked: 'Session revoked successfully!',
      cannotRevokeCurrent: 'Cannot revoke current session',
      error: 'Error loading sessions',
      errorRevoking: 'Error revoking session',
      errorRevokingAll: 'Error revoking sessions',
    },
  },

  // Common - Common elements
  common: {
    loading: 'Loading...',
    error: 'Error',
    errorLoadingData: 'Error loading data',
    language: 'Language',
    languageOption_pt: 'Português',
    languageOption_en: 'English',
    languageOption_es: 'Español',
  },
};
