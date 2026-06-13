import { fileURLToPath } from 'node:url';

import { printResultAndExit } from './fs-utils.mjs';
import { validateArchitecture } from './validate-architecture.mjs';
import { validateKnowledge } from './validate-knowledge.mjs';
import { scoreQuality } from './score-quality.mjs';

export function validateAll({ root = process.cwd() } = {}) {
  const results = [
    validateKnowledge({ root }),
    validateArchitecture({ root }),
    scoreQuality({ root }),
  ];
  const messages = results.flatMap((result) => result.messages);
  return { ok: messages.length === 0, messages };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  printResultAndExit(validateAll());
}
