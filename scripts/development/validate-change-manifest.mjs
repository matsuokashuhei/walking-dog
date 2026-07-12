import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const CHANGE_DIRECTORY = join("docs", "development", "changes");
const SCHEMA_PATH = join(CHANGE_DIRECTORY, "schema.json");
const ALLOWED_ROLES = new Set(["planner", "integration", "inventory", "implementation", "final-review"]);
const ALLOWED_MODELS = new Set(["luna", "terra", "sol"]);
const ALLOWED_THINKING = new Set(["low", "medium", "high"]);
const THREAD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function validateChangeManifest({ root, changedPaths, prEvidence, currentHead } = {}) {
  if (!root) throw new Error("change manifest validation requires a repository root");
  const loaded = loadExactlyOneChangedManifest(root, changedPaths ?? []);
  const { manifest } = loaded;
  const schema = loadSchema(root);
  const schemaErrors = validateJsonSchema(manifest, schema);
  if (schemaErrors.length > 0) throw new Error(`change manifest schema error: ${schemaErrors.join("; ")}`);
  validateTasks(manifest.tasks);
  validateOwnership(manifest.ownership, manifest.tasks, changedPaths ?? []);
  validateEvidence(prEvidence, currentHead, loaded);
  return manifest;
}

export async function validateManifestHistory({ root } = {}) {
  if (!root) throw new Error("change manifest history validation requires a repository root");
  const schema = loadSchema(root);
  const directory = join(root, CHANGE_DIRECTORY);
  const manifests = existsSync(directory)
    ? readdirSync(directory).filter((path) => isManifestPath(`${CHANGE_DIRECTORY}/${path}`))
    : [];
  for (const filename of manifests) {
    const manifest = JSON.parse(readFileSync(join(directory, filename), "utf8"));
    const schemaErrors = validateJsonSchema(manifest, schema);
    if (schemaErrors.length > 0) throw new Error(`change manifest schema error in ${filename}: ${schemaErrors.join("; ")}`);
    validateTasks(manifest.tasks);
    validateOwnership(manifest.ownership, manifest.tasks, []);
  }
}

function isManifestPath(path) {
  return new RegExp(`^${CHANGE_DIRECTORY.replaceAll("\\", "\\\\").replaceAll("/", "\\/")}\\/\\d{4}-\\d{2}-\\d{2}-.+\\.json$`).test(path);
}

function loadExactlyOneChangedManifest(root, changedPaths) {
  const manifests = changedPaths.filter(isManifestPath);
  if (manifests.length !== 1) throw new Error(`expected exactly one changed manifest, found ${manifests.length}`);
  const path = join(root, manifests[0]);
  if (!existsSync(path)) throw new Error(`changed manifest was deleted: ${manifests[0]}`);
  try {
    return { manifest: JSON.parse(readFileSync(path, "utf8")), path: manifests[0] };
  } catch (error) {
    throw new Error(`change manifest schema error: ${error.message}`);
  }
}

function loadSchema(root) {
  try {
    return JSON.parse(readFileSync(join(root, SCHEMA_PATH), "utf8"));
  } catch (error) {
    throw new Error(`change manifest schema error: cannot load ${SCHEMA_PATH}: ${error.message}`);
  }
}

// This small, explicit JSON Schema evaluator executes the repository schema for
// its closed keyword subset: type, required, properties, additionalProperties,
// enum, const, pattern, minLength, minItems, and items.
function validateJsonSchema(value, schema, path = "$", errors = []) {
  if (Object.hasOwn(schema, "const") && value !== schema.const) errors.push(`${path} must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path} must be one of ${schema.enum.join(", ")}`);
  if (schema.type && !matchesType(value, schema.type)) {
    errors.push(`${path} must be ${schema.type}`);
    return errors;
  }
  if (schema.type === "object") {
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) errors.push(`${path}.${key} is required`);
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) if (!Object.hasOwn(schema.properties ?? {}, key)) errors.push(`${path}.${key} is not allowed`);
    }
    for (const [key, child] of Object.entries(schema.properties ?? {})) if (Object.hasOwn(value, key)) validateJsonSchema(value[key], child, `${path}.${key}`, errors);
  }
  if (schema.type === "array") {
    if (schema.minItems && value.length < schema.minItems) errors.push(`${path} must contain at least ${schema.minItems} item(s)`);
    if (schema.items) value.forEach((item, index) => validateJsonSchema(item, schema.items, `${path}[${index}]`, errors));
  }
  if (schema.type === "string") {
    if (schema.minLength && value.length < schema.minLength) errors.push(`${path} must not be empty`);
    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) errors.push(`${path} does not match ${schema.pattern}`);
  }
  return errors;
}

function matchesType(value, type) {
  if (type === "array") return Array.isArray(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  return typeof value === type;
}

function validateTasks(tasks) {
  const byId = new Map();
  const threadIds = new Set();
  for (const task of tasks) {
    if (byId.has(task.id)) throw new Error("change manifest schema error: task ids must be unique");
    byId.set(task.id, task);
    if (!ALLOWED_ROLES.has(task.role) || !ALLOWED_MODELS.has(task.model) || !ALLOWED_THINKING.has(task.thinking) || !THREAD_ID.test(task.threadId)) {
      throw new Error(`change manifest schema error: invalid routing for task ${task.id}`);
    }
    if (task.owner !== task.threadId || threadIds.has(task.owner)) throw new Error("change manifest requires one unique owner identity per task");
    threadIds.add(task.owner);
  }
  for (const task of tasks) {
    if (task.dependencies.some((dependency) => dependency === task.id || !byId.has(dependency))) throw new Error(`change manifest has invalid dependency for ${task.id}`);
  }
  const implementation = tasks.filter((task) => task.role === "implementation");
  const finalReview = tasks.filter((task) => task.role === "final-review");
  if (finalReview.length !== 1 || finalReview[0].model !== "sol") throw new Error("change manifest requires exactly one final-review Sol task");
  const reviewer = finalReview[0];
  if (!reviewer.independentOf || reviewer.id === reviewer.independentOf || implementation.some((task) => task.id === reviewer.id || task.threadId === reviewer.threadId) || !implementation.some((task) => task.id === reviewer.independentOf)) {
    throw new Error("final-review task must be independent of implementation");
  }
  if (reviewer.thinking !== "medium" && reviewer.thinking !== "high") throw new Error("independent Sol final-review thinking must be medium or high");
  if (reviewer.evidence?.channel !== "pr-body-or-ci" || !reviewer.evidence.required?.includes("headSha") || !reviewer.evidence.required?.includes("approval")) {
    throw new Error("independent Sol final-review requires external head SHA and approval evidence");
  }
}

function validateOwnership(ownership, tasks, changedPaths) {
  const taskIds = new Set(tasks.map((task) => task.id));
  for (const entry of ownership) if (!taskIds.has(entry.task)) throw new Error(`change manifest ownership references unknown task ${entry.task}`);
  for (let first = 0; first < ownership.length; first += 1) {
    for (let second = first + 1; second < ownership.length; second += 1) {
      const a = ownership[first].path;
      const b = ownership[second].path;
      if (ownershipPathsOverlap(a, b)) throw new Error(`overlap in change manifest ownership: ${a} and ${b}`);
    }
  }
  for (const changedPath of changedPaths) {
    const matches = ownership.filter(({ path }) => ownedBy(path, changedPath));
    if (matches.length === 0) throw new Error(`unowned changed path: ${changedPath}`);
    if (matches.length > 1) throw new Error(`overlap in change manifest ownership for ${changedPath}`);
  }
}

function ownedBy(ownershipPath, changedPath) {
  return ownershipPath.endsWith("/") ? changedPath.startsWith(ownershipPath) : changedPath === ownershipPath;
}

function ownershipPathsOverlap(first, second) {
  return first === second
    || (first.endsWith("/") && second.startsWith(first))
    || (second.endsWith("/") && first.startsWith(second));
}

function validateEvidence(prEvidence, currentHead, { manifest, path }) {
  if (!prEvidence && !currentHead) return;
  if (!prEvidence || typeof prEvidence.headSha !== "string" || prEvidence.headSha.length === 0 || typeof currentHead !== "string" || currentHead.length === 0) {
    throw new Error("PR evidence requires a head SHA");
  }
  if (prEvidence.headSha !== currentHead) throw new Error("PR approval head SHA does not match current head");
  if (prEvidence.manifestPath !== path) throw new Error("PR evidence manifestPath does not match the changed manifest");
  if (!Array.isArray(prEvidence.tests) || prEvidence.tests.length === 0 || prEvidence.tests.some((entry) => !entry || typeof entry.command !== "string" || entry.command.length === 0 || !["passed", "no-affected-journey"].includes(entry.result))) {
    throw new Error("PR evidence requires nonempty test results");
  }
  const expected = {
    planner: manifest.tasks.find((task) => task.role === "planner" && task.model === "sol"),
    inventory: manifest.tasks.find((task) => task.role === "inventory" && task.model === "luna"),
    implementation: manifest.tasks.find((task) => task.role === "implementation" && task.model === "terra"),
    finalReview: manifest.tasks.find((task) => task.role === "final-review" && task.model === "sol"),
  };
  for (const [role, task] of Object.entries(expected)) {
    const actual = prEvidence.tasks?.[role];
    if (!task || actual?.id !== task.id || actual?.threadId !== task.threadId) throw new Error(`PR evidence task identity does not match manifest ${role}`);
  }
  const review = prEvidence.solReview;
  const hasBlockingFinding = review?.findings?.some((finding) => ["Critical", "Important"].includes(finding?.severity));
  if (!expected.finalReview.independentOf || !["approved", "approved-with-notes"].includes(review?.approval) || typeof review?.result !== "string" || review.result.length === 0 || !Array.isArray(review.findings) || hasBlockingFinding) {
    throw new Error("PR evidence requires an allowed independent Sol approval and result");
  }
}

function changedPaths(root, base, head) {
  const output = execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMRD", `${base}...${head}`], { cwd: root, encoding: "utf8" });
  return output.split("\n").filter(Boolean);
}

function parseArgs(args) {
  const options = { root: process.cwd(), head: "HEAD" };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--history") options.history = true;
    else if (value === "--base") options.base = args[++index];
    else if (value === "--head") options.head = args[++index];
    else if (value === "--pr-evidence") options.prEvidence = JSON.parse(args[++index]);
    else if (value === "--pr-body") options.prEvidence = parsePrEvidence(args[++index]);
    else if (value === "--require-pr-evidence") options.requirePrEvidence = true;
    else throw new Error(`unknown argument: ${value}`);
  }
  if (!options.history && !options.base) throw new Error("usage: validate-change-manifest.sh --history | --base <base> [--head <head>] [--pr-evidence <json>] [--require-pr-evidence]");
  return options;
}

export function parsePrEvidence(body) {
  const matches = [...(body ?? "").matchAll(/<!--\s*change-manifest-evidence:\s*({[\s\S]*?})\s*-->/g)];
  if (matches.length !== 1) throw new Error(`PR evidence requires exactly one change-manifest-evidence marker, found ${matches.length}`);
  try {
    return JSON.parse(matches[0][1]);
  } catch (error) {
    throw new Error(`PR evidence is malformed: ${error.message}`);
  }
}

if (import.meta.main) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.history) {
      await validateManifestHistory({ root: options.root });
      process.exit(0);
    }
    const evidence = options.prEvidence ?? (process.env.CHANGE_MANIFEST_PR_EVIDENCE ? JSON.parse(process.env.CHANGE_MANIFEST_PR_EVIDENCE) : undefined);
    if (options.requirePrEvidence && !evidence) throw new Error("PR evidence requires head SHA and approval");
    const head = execFileSync("git", ["rev-parse", options.head], { cwd: options.root, encoding: "utf8" }).trim();
    await validateChangeManifest({ root: options.root, changedPaths: changedPaths(options.root, options.base, options.head), prEvidence: evidence, currentHead: evidence ? head : undefined });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
