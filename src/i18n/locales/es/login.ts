export default {
  title: 'Admin Console',

  tabs: {
    signIn: 'Iniciar sesión',
    signUp: 'Registrarse',
  },

  headings: {
    signIn: 'Entrar a tu cuenta',
    signUp: 'Crear una cuenta',
    mfa: 'Confirma tu identidad',
  },

  placeholders: {
    email: 'Ingresa tu correo electrónico',
    password: 'Ingresa tu contraseña',
    fullName: 'Tu nombre completo',
    mfaCode: 'Código MFA',
  },

  userType: {
    individual: 'Persona Física',
    business: 'Persona Jurídica',
  },

  buttons: {
    signIn: 'Entrar',
    signInLoading: 'Entrando...',
    forgotPassword: '¿Olvidaste tu contraseña?',
    validateCode: 'Validar código',
    validateCodeLoading: 'Validando...',
    backToLogin: 'Volver al inicio de sesión',
    continueSignUp: 'Continuar registro',
    doLogin: 'Iniciar sesión',
  },

  aria: {
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
  },

  mfa: {
    defaultMessage: 'Enviamos un código de verificación a tu correo electrónico.',
    sentTo: 'Enviado a',
  },

  errors: {
    invalidCredentials: 'Correo o contraseña inválidos',
    loginFailed: 'Error al iniciar sesión. Intenta de nuevo.',
    mfaInvalid: 'Código MFA inválido o expirado.',
    nameRequired: 'El nombre es obligatorio',
    emailRequired: 'El correo electrónico es obligatorio',
  },

  signUpFooter: '¿Ya tienes una cuenta?',
};
