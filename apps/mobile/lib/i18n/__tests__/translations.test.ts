import en from '../locales/en.json';
import ja from '../locales/ja.json';

function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return getKeys(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

describe('Translation completeness', () => {
  const enKeys = getKeys(en).sort();
  const jaKeys = getKeys(ja).sort();

  it('every key in en.json exists in ja.json', () => {
    const missingInJa = enKeys.filter((k) => !jaKeys.includes(k));
    expect(missingInJa).toEqual([]);
  });

  it('every key in ja.json exists in en.json', () => {
    const missingInEn = jaKeys.filter((k) => !enKeys.includes(k));
    expect(missingInEn).toEqual([]);
  });
});
