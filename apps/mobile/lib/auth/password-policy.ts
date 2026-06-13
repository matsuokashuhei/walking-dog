export const PASSWORD_REQUIREMENTS = {
  minimumLength: 8,
  requiresUppercase: true,
  requiresLowercase: true,
  requiresNumber: true,
} as const;

export const PASSWORD_RULES_DESCRIPTOR =
  'minlength: 8; required: upper; required: lower; required: digit;';

export function isValidPassword(password: string): boolean {
  return (
    password.length >= PASSWORD_REQUIREMENTS.minimumLength &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}
