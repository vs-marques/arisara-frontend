export const generateStrongPassword = (length = 12): string => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
  return Array.from({ length }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
};
