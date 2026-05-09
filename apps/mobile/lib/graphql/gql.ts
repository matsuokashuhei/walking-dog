export function gql(
  document: TemplateStringsArray,
  ...substitutions: unknown[]
): string;
export function gql(document: string): string;
export function gql(
  document: string | TemplateStringsArray,
  ...substitutions: unknown[]
): string {
  if (typeof document === 'string') return document;

  return document.reduce((result, part, index) => {
    const substitution = substitutions[index];
    return substitution === undefined ? result + part : result + part + String(substitution);
  }, '');
}
