import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { parsePrEvidence, validateChangeManifest } from "../validate-change-manifest.mjs";

const manifestPath = "docs/development/changes/2026-07-12-development-process-architecture-simplification.json";
const historicalPath = "docs/development/changes/2026-07-11-historical-change.json";
const schemaPath = "docs/development/changes/schema.json";
const schema = await readFile(new URL("../../../docs/development/changes/schema.json", import.meta.url));

const validManifest = (overrides = {}) => ({
  schemaVersion: 1,
  change: {
    slug: "development-process-architecture-simplification",
    base: "origin/main",
    singleResponsibility: "Record and enforce this architecture simplification change without changing product behavior.",
    nonTargets: ["Product behavior", "Maestro journey migration"],
    noAffectedJourney: true,
    sameCauseFailureThreshold: 3,
    rollback: "Revert this change set.",
  },
  ownership: [
    { path: "docs/development/changes/", task: "terra-implementation" },
    { path: "scripts/development/", task: "terra-implementation" },
  ],
  tasks: [
    {
      id: "sol-planning",
      role: "planner",
      model: "sol",
      thinking: "high",
      threadId: "019f505b-e7ba-7ae3-8b77-1d77c8882475",
      owner: "019f505b-e7ba-7ae3-8b77-1d77c8882475",
      responsibility: "Own the approved plan and integration constraints.",
      dependencies: [],
      acceptance: ["Approved design and plan are committed."],
      consumers: [{ name: "AGENTS.md", disposition: "updated", decision: "Index the development-process source of truth." }],
      enforcement: { layer: "documentation", rejectedSimplerAlternatives: ["Untracked conversational routing"] },
      rollback: "Revert planning documentation.",
    },
    {
      id: "luna-inventory",
      role: "inventory",
      model: "luna",
      thinking: "medium",
      threadId: "019f54f5-eaaf-74d0-9901-77673361c3a9",
      owner: "019f54f5-eaaf-74d0-9901-77673361c3a9",
      responsibility: "Supply read-only current-state inventory.",
      dependencies: ["sol-planning"],
      acceptance: ["Read-only inventory completed."],
      consumers: [{ name: "architecture-validator", disposition: "checked", decision: "Use inventory to preserve fail-closed contracts." }],
      enforcement: { layer: "documentation", rejectedSimplerAlternatives: ["Ad hoc source exploration"] },
      rollback: "No repository changes.",
    },
    {
      id: "terra-implementation",
      role: "implementation",
      model: "terra",
      thinking: "high",
      threadId: "019f54fa-a2de-79b1-b4b1-c22c3630f176",
      owner: "019f54fa-a2de-79b1-b4b1-c22c3630f176",
      responsibility: "Implement and verify all tracked changes in the Terra thread.",
      dependencies: ["sol-planning", "luna-inventory"],
      acceptance: ["Focused regression suite passes."],
      consumers: [{ name: "scripts/harness/validate-all.sh", disposition: "updated", decision: "Run manifest validation with existing harness gates." }],
      enforcement: { layer: "schema", rejectedSimplerAlternatives: ["Archival prose without machine validation"] },
      rollback: "Revert implementation commit.",
    },
    {
      id: "sol-final-review",
      role: "final-review",
      model: "sol",
      thinking: "medium",
      threadId: "019f54f9-cd15-72a2-8d04-b0cad89b700b",
      owner: "019f54f9-cd15-72a2-8d04-b0cad89b700b",
      responsibility: "Independently review the frozen Terra head only.",
      dependencies: ["terra-implementation"],
      independentOf: "terra-implementation",
      evidence: { channel: "pr-body-or-ci", required: ["headSha", "approval"] },
      acceptance: ["Independent final review is recorded externally."],
      consumers: [{ name: "pull request body", disposition: "updated", decision: "Store exact head SHA approval externally without post-review manifest edits." }],
      enforcement: { layer: "ci", rejectedSimplerAlternatives: ["Trusting a review without SHA binding"] },
      rollback: "Request a new review after a new freeze.",
    },
  ],
  milestones: [
    {
      name: "manifest-red",
      state: "red",
      commands: ["node --test scripts/development/tests/validate-change-manifest.test.mjs"],
      result: "RED: validator module absent before implementation.",
    },
  ],
  ...overrides,
});

const validEvidence = (headSha = "abc") => {
  const tasks = validManifest().tasks;
  return {
    manifestPath,
    tasks: {
      planner: { id: tasks[0].id, threadId: tasks[0].threadId },
      inventory: { id: tasks[1].id, threadId: tasks[1].threadId },
      implementation: { id: tasks[2].id, threadId: tasks[2].threadId },
      finalReview: { id: tasks[3].id, threadId: tasks[3].threadId },
    },
    tests: [{ command: "node --test scripts/development/tests/validate-change-manifest.test.mjs", result: "passed" }],
    headSha,
    solReview: { approval: "approved", result: "No Critical or Important findings.", findings: [] },
  };
};

async function fixture({ manifests = [{ path: manifestPath, value: validManifest() }], changedPaths = [manifestPath, "scripts/development/example.mjs"] } = {}) {
  const root = await mkdtemp(join(tmpdir(), "walking-dog-manifest-"));
  await mkdir(join(root, "docs", "development", "changes"), { recursive: true });
  await writeFile(join(root, schemaPath), schema);
  await Promise.all(manifests.map(async ({ path, value }) => {
    const destination = join(root, path);
    await mkdir(join(destination, ".."), { recursive: true });
    await writeFile(destination, JSON.stringify(value));
  }));
  return { root, changedPaths };
}

async function rejectsFixture(t, options, expression) {
  const value = await fixture(options);
  t.after(() => rm(value.root, { recursive: true }));
  await assert.rejects(validateChangeManifest(value), expression);
}

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function commit(root, message) {
  git(root, ["add", "--all", "--force"]);
  git(root, ["-c", "user.email=tests@example.invalid", "-c", "user.name=Manifest tests", "commit", "-m", message]);
}

function validatePrDiff(root, base) {
  return execFileSync(
    process.execPath,
    [new URL("../validate-change-manifest.mjs", import.meta.url).pathname, "--base", base, "--head", "HEAD"],
    { cwd: root, encoding: "utf8", stdio: "pipe" },
  );
}

function changedManifest() {
  return {
    ...validManifest(),
    change: {
      ...validManifest().change,
      singleResponsibility: "Record deleted paths in ownership validation.",
    },
  };
}

test("selects exactly one changed manifest while permitting historical manifests", async (t) => {
  const valid = await fixture({ manifests: [
    { path: historicalPath, value: validManifest({ change: { ...validManifest().change, slug: "historical-change" } }) },
    { path: manifestPath, value: validManifest() },
  ] });
  t.after(() => rm(valid.root, { recursive: true }));
  await assert.doesNotReject(validateChangeManifest(valid));

  await rejectsFixture(t, { changedPaths: ["scripts/development/example.mjs"] }, /exactly one changed manifest/i);
  await rejectsFixture(t, {
    manifests: [
      { path: manifestPath, value: validManifest() },
      { path: historicalPath, value: validManifest({ change: { ...validManifest().change, slug: "historical-change" } }) },
    ],
    changedPaths: [manifestPath, historicalPath, "scripts/development/example.mjs"],
  }, /exactly one changed manifest/i);
});

test("PR diff includes deleted paths in ownership checks", async (t) => {
  const value = await fixture();
  t.after(() => rm(value.root, { recursive: true }));
  const unowned = join(value.root, "apps", "api", "src", "deleted.rs");
  await mkdir(join(unowned, ".."), { recursive: true });
  await writeFile(unowned, "pub struct Deleted;\n");
  git(value.root, ["init"]);
  commit(value.root, "base");
  const base = git(value.root, ["rev-parse", "HEAD"]);

  await writeFile(join(value.root, manifestPath), JSON.stringify(changedManifest()));
  await rm(unowned);
  commit(value.root, "delete unowned source");

  assert.throws(
    () => validatePrDiff(value.root, base),
    /unowned changed path: apps\/api\/src\/deleted\.rs/i,
  );
});

test("PR diff permits an owned deletion but rejects a deleted manifest fail closed", async (t) => {
  const owned = await fixture();
  t.after(() => rm(owned.root, { recursive: true }));
  const deletedOwnedPath = join(owned.root, "scripts", "development", "deleted.mjs");
  await mkdir(join(deletedOwnedPath, ".."), { recursive: true });
  await writeFile(deletedOwnedPath, "export {};\n");
  git(owned.root, ["init"]);
  commit(owned.root, "base");
  const ownedBase = git(owned.root, ["rev-parse", "HEAD"]);
  await writeFile(join(owned.root, manifestPath), JSON.stringify(changedManifest()));
  await rm(deletedOwnedPath);
  commit(owned.root, "delete owned source");
  assert.doesNotThrow(() => validatePrDiff(owned.root, ownedBase));

  const deletedManifest = await fixture();
  t.after(() => rm(deletedManifest.root, { recursive: true }));
  git(deletedManifest.root, ["init"]);
  commit(deletedManifest.root, "base");
  const manifestBase = git(deletedManifest.root, ["rev-parse", "HEAD"]);
  await rm(join(deletedManifest.root, manifestPath));
  commit(deletedManifest.root, "delete manifest");
  assert.throws(
    () => validatePrDiff(deletedManifest.root, manifestBase),
    /changed manifest was deleted/i,
  );
});

test("PR diff accounts for both rename and copy paths during ownership validation", async (t) => {
  const renamed = await fixture();
  t.after(() => rm(renamed.root, { recursive: true }));
  const renamedSource = join(renamed.root, "unowned", "renamed.rs");
  await mkdir(join(renamedSource, ".."), { recursive: true });
  await writeFile(renamedSource, "pub struct Renamed;\n");
  git(renamed.root, ["init"]);
  commit(renamed.root, "rename base");
  const renameBase = git(renamed.root, ["rev-parse", "HEAD"]);
  await writeFile(join(renamed.root, manifestPath), JSON.stringify(changedManifest()));
  await mkdir(join(renamed.root, "scripts", "development"), { recursive: true });
  await rename(renamedSource, join(renamed.root, "scripts", "development", "renamed.mjs"));
  commit(renamed.root, "rename unowned source");
  assert.throws(
    () => validatePrDiff(renamed.root, renameBase),
    /unowned changed path: unowned\/renamed\.rs/i,
  );

  const copied = await fixture();
  t.after(() => rm(copied.root, { recursive: true }));
  const copiedSource = join(copied.root, "unowned", "copied.rs");
  await mkdir(join(copiedSource, ".."), { recursive: true });
  await writeFile(copiedSource, "pub struct Copied;\n");
  git(copied.root, ["init"]);
  commit(copied.root, "copy base");
  const copyBase = git(copied.root, ["rev-parse", "HEAD"]);
  await writeFile(join(copied.root, manifestPath), JSON.stringify(changedManifest()));
  await mkdir(join(copied.root, "scripts", "development"), { recursive: true });
  await writeFile(join(copied.root, "scripts", "development", "copied.mjs"), "pub struct Copied;\n");
  commit(copied.root, "copy unowned source");
  assert.throws(
    () => validatePrDiff(copied.root, copyBase),
    /unowned changed path: unowned\/copied\.rs/i,
  );

  const ownedCopy = await fixture();
  t.after(() => rm(ownedCopy.root, { recursive: true }));
  const ownedSource = join(ownedCopy.root, "scripts", "development", "copy-source.mjs");
  await mkdir(join(ownedSource, ".."), { recursive: true });
  await writeFile(ownedSource, "export const source = true;\n");
  git(ownedCopy.root, ["init"]);
  commit(ownedCopy.root, "owned copy base");
  const ownedCopyBase = git(ownedCopy.root, ["rev-parse", "HEAD"]);
  await writeFile(join(ownedCopy.root, manifestPath), JSON.stringify(changedManifest()));
  await writeFile(join(ownedCopy.root, "scripts", "development", "copy-target.mjs"), "export const source = true;\n");
  commit(ownedCopy.root, "owned copy");
  assert.doesNotThrow(() => validatePrDiff(ownedCopy.root, ownedCopyBase));
});

test("rejects schema-invalid manifest and every required empty field", async (t) => {
  const mutations = [
    (value) => ({ ...value, schemaVersion: 2 }),
    (value) => ({ ...value, change: { ...value.change, singleResponsibility: "" } }),
    (value) => ({ ...value, change: { ...value.change, nonTargets: [] } }),
    (value) => ({ ...value, change: { ...value.change, rollback: "" } }),
    (value) => ({ ...value, ownership: [] }),
    (value) => ({ ...value, tasks: value.tasks.map((task) => task.id === "terra-implementation" ? { ...task, acceptance: [] } : task) }),
    (value) => ({ ...value, tasks: value.tasks.map((task) => task.id === "terra-implementation" ? { ...task, consumers: [] } : task) }),
    (value) => ({ ...value, tasks: value.tasks.map((task) => task.id === "terra-implementation" ? { ...task, rollback: "" } : task) }),
    (value) => ({ ...value, tasks: value.tasks.map((task) => task.id === "terra-implementation" ? { ...task, responsibility: "" } : task) }),
    (value) => ({ ...value, tasks: value.tasks.map((task) => task.id === "terra-implementation" ? { ...task, owner: "" } : task) }),
    (value) => ({ ...value, tasks: value.tasks.map((task) => task.id === "terra-implementation" ? { ...task, dependencies: undefined } : task) }),
    (value) => ({ ...value, tasks: value.tasks.map((task) => task.id === "terra-implementation" ? { ...task, consumers: [{ ...task.consumers[0], decision: "" }] } : task) }),
    (value) => ({ ...value, tasks: value.tasks.map((task) => task.id === "terra-implementation" ? { ...task, enforcement: { ...task.enforcement, rejectedSimplerAlternatives: [] } } : task) }),
    (value) => ({ ...value, milestones: [{ ...value.milestones[0], name: "" }] }),
    (value) => ({ ...value, milestones: [{ ...value.milestones[0], state: "complete" }] }),
    (value) => ({ ...value, milestones: [{ ...value.milestones[0], commands: [] }] }),
    (value) => ({ ...value, milestones: [{ ...value.milestones[0], result: "" }] }),
  ];
  for (const mutate of mutations) {
    await rejectsFixture(t, { manifests: [{ path: manifestPath, value: mutate(validManifest()) }] }, /schema error|acceptance|consumers|rollback/i);
  }
});

test("rejects unowned paths and same-task or different-task ownership overlap", async (t) => {
  await rejectsFixture(t, { changedPaths: [manifestPath, "apps/api/src/lib.rs"] }, /unowned/i);
  await rejectsFixture(t, { changedPaths: [manifestPath, "scripts/development-other/example.mjs"] }, /unowned/i);
  for (const task of ["terra-implementation", "sol-planning"]) {
    await rejectsFixture(t, {
      manifests: [{ path: manifestPath, value: validManifest({ ownership: [
        { path: "docs/development/", task: "terra-implementation" },
        { path: "docs/development/changes/", task },
        { path: "scripts/development/", task: "terra-implementation" },
      ] }) }],
    }, /overlap/i);
  }
});

test("treats ownership directories as path segments, not raw string prefixes", async (t) => {
  const value = await fixture({
    manifests: [{ path: manifestPath, value: validManifest({ ownership: [
      { path: "docs/development/changes/", task: "terra-implementation" },
      { path: "docs/development-other/", task: "terra-implementation" },
      { path: "scripts/development/", task: "terra-implementation" },
    ] }) }],
  });
  t.after(() => rm(value.root, { recursive: true }));
  await assert.doesNotReject(validateChangeManifest(value));
});

test("rejects every invalid role, model, thinking level, reused thread, and missing reviewer", async (t) => {
  for (const [field, invalid] of [["role", "builder"], ["model", "gpt"], ["thinking", "max"]]) {
    await rejectsFixture(t, { manifests: [{ path: manifestPath, value: validManifest({ tasks: validManifest().tasks.map((task) => task.id === "terra-implementation" ? { ...task, [field]: invalid } : task) }) }] }, /schema error|invalid routing/i);
  }
  await rejectsFixture(t, { manifests: [{ path: manifestPath, value: validManifest({ tasks: validManifest().tasks.map((task) => task.id === "sol-final-review" ? { ...task, threadId: "019f54fa-a2de-79b1-b4b1-c22c3630f176", owner: "019f54fa-a2de-79b1-b4b1-c22c3630f176" } : task) }) }] }, /owner identity|independent/i);
  await rejectsFixture(t, { manifests: [{ path: manifestPath, value: validManifest({ tasks: validManifest().tasks.map((task) => task.id === "sol-final-review" ? { ...task, role: "planner" } : task) }) }] }, /final-review.*sol/i);
});

test("rejects malformed PR evidence and approval SHA mismatch", async (t) => {
  const value = await fixture();
  t.after(() => rm(value.root, { recursive: true }));
  await assert.rejects(validateChangeManifest({ ...value, prEvidence: { ...validEvidence(), headSha: "" }, currentHead: "abc" }), /head SHA/i);
  await assert.rejects(validateChangeManifest({ ...value, prEvidence: { ...validEvidence(), headSha: "abc" }, currentHead: "def" }), /approval.*head/i);
  await assert.rejects(validateChangeManifest({ ...value, prEvidence: { ...validEvidence(), manifestPath: historicalPath }, currentHead: "abc" }), /manifestPath/i);
  await assert.rejects(validateChangeManifest({ ...value, prEvidence: { ...validEvidence(), tasks: { ...validEvidence().tasks, finalReview: { id: "wrong", threadId: "wrong" } } }, currentHead: "abc" }), /task identity/i);
  await assert.rejects(validateChangeManifest({ ...value, prEvidence: { ...validEvidence(), tests: [] }, currentHead: "abc" }), /test results/i);
  await assert.rejects(validateChangeManifest({ ...value, prEvidence: { ...validEvidence(), tests: [{ command: "cargo test", result: "failed" }] }, currentHead: "abc" }), /test results/i);
  await assert.rejects(validateChangeManifest({ ...value, prEvidence: { ...validEvidence(), solReview: { approval: "x", result: "review" } }, currentHead: "abc" }), /allowed independent Sol/i);
  await assert.rejects(validateChangeManifest({ ...value, prEvidence: { ...validEvidence(), solReview: { approval: "changes-requested", result: "review", findings: [] } }, currentHead: "abc" }), /allowed independent Sol/i);
  await assert.rejects(validateChangeManifest({ ...value, prEvidence: { ...validEvidence(), solReview: { approval: "approved-with-notes", result: "review", findings: [{ severity: "Important" }] } }, currentHead: "abc" }), /allowed independent Sol/i);
  await assert.doesNotReject(validateChangeManifest({ ...value, prEvidence: validEvidence(), currentHead: "abc" }));
});

test("parses exactly one change-manifest evidence marker from PR Markdown", () => {
  assert.deepEqual(
    parsePrEvidence(`notes\n<!-- change-manifest-evidence: ${JSON.stringify(validEvidence())} -->`),
    validEvidence(),
  );
  assert.throws(() => parsePrEvidence("no marker"), /exactly one/i);
  assert.throws(() => parsePrEvidence("<!-- change-manifest-evidence: {bad} -->"), /malformed/i);
  assert.throws(() => parsePrEvidence("<!-- change-manifest-evidence: {\"headSha\":\"a\"} -->\n<!-- change-manifest-evidence: {\"headSha\":\"b\"} -->"), /exactly one/i);
});
