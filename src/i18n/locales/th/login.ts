export default {
  title: 'คอนโซลผู้ดูแลระบบ',
  tabs: { signIn: 'เข้าสู่ระบบ', signUp: 'สมัครสมาชิก' },
  headings: {
    signIn: 'เข้าสู่บัญชีของคุณ',
    signUp: 'สร้างบัญชี',
    mfa: 'ยืนยันตัวตน',
  },
  placeholders: {
    email: 'กรอกอีเมล',
    password: 'กรอกรหัสผ่าน',
    fullName: 'ชื่อเต็มของคุณ',
    mfaCode: 'รหัส MFA',
  },
  userType: { individual: 'บุคคลทั่วไป', business: 'องค์กร' },
  buttons: {
    signIn: 'เข้าสู่ระบบ',
    signInLoading: 'กำลังเข้าสู่ระบบ...',
    forgotPassword: 'ลืมรหัสผ่าน?',
    validateCode: 'ยืนยันรหัส',
    validateCodeLoading: 'กำลังยืนยัน...',
    backToLogin: 'กลับไปเข้าสู่ระบบ',
    continueSignUp: 'ดำเนินการสมัครต่อ',
    doLogin: 'เข้าสู่ระบบ',
  },
  aria: { showPassword: 'แสดงรหัสผ่าน', hidePassword: 'ซ่อนรหัสผ่าน' },
  mfa: {
    defaultMessage: 'เราได้ส่งรหัสยืนยันไปยังอีเมลของคุณแล้ว',
    sentTo: 'ส่งไปที่',
  },
  errors: {
    invalidCredentials: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    loginFailed: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่',
    mfaInvalid: 'รหัส MFA ไม่ถูกต้องหรือหมดอายุ',
    nameRequired: 'กรุณากรอกชื่อ',
    emailRequired: 'กรุณากรอกอีเมล',
  },
  signUpFooter: 'มีบัญชีอยู่แล้ว?',
};
