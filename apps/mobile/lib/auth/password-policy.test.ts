import { isValidPassword, PASSWORD_RULES_DESCRIPTOR } from './password-policy';

describe('password policy', () => {
  it('accepts passwords that meet the Cognito policy', () => {
    expect(isValidPassword('Password1')).toBe(true);
  });

  it('rejects passwords shorter than eight characters', () => {
    expect(isValidPassword('Pass1')).toBe(false);
  });

  it('rejects passwords without an uppercase letter', () => {
    expect(isValidPassword('password1')).toBe(false);
  });

  it('rejects passwords without a lowercase letter', () => {
    expect(isValidPassword('PASSWORD1')).toBe(false);
  });

  it('rejects passwords without a number', () => {
    expect(isValidPassword('Password')).toBe(false);
  });

  it('exports the native password rules descriptor for autofill', () => {
    expect(PASSWORD_RULES_DESCRIPTOR).toBe(
      'minlength: 8; required: upper; required: lower; required: digit;',
    );
  });
});
