import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parse as parseYaml } from "yaml";

test("package metadata targets GitHub Packages", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));

  assert.equal(pkg.name, "@jameswangxin/ai-coding-workflow-toolkit");
  assert.equal(pkg.publishConfig.registry, "https://npm.pkg.github.com");
});

test("GitHub Packages workflow publishes npm package on version tags", async () => {
  const workflow = parseYaml(
    await readFile(".github/workflows/publish-github-packages.yml", "utf8"),
  );

  assert.deepEqual(workflow.on.push.tags, ["v*"]);
  assert.equal(workflow.permissions.contents, "read");
  assert.equal(workflow.permissions.packages, "write");

  const steps = workflow.jobs.publish.steps;
  assert.ok(steps.some((step) => step.uses === "actions/checkout@v4"));
  assert.ok(steps.some((step) => step.uses === "actions/setup-node@v4" && step.with["registry-url"] === "https://npm.pkg.github.com"));
  assert.ok(steps.some((step) => step.run === "npm ci"));
  assert.ok(steps.some((step) => step.run === "npm run check"));
  assert.ok(steps.some((step) => step.run === "npm test"));
  assert.ok(steps.some((step) => step.run === "npm publish" && step.env.NODE_AUTH_TOKEN === "${{ secrets.GITHUB_TOKEN }}"));
});

test("README documents the GitHub Packages package name and registry", async () => {
  const readme = await readFile("README.md", "utf8");

  assert.ok(readme.includes("@jameswangxin/ai-coding-workflow-toolkit"));
  assert.ok(readme.includes("https://npm.pkg.github.com"));
  assert.ok(readme.includes("@jameswangxin:registry=https://npm.pkg.github.com"));
  assert.ok(readme.includes("~/.npmrc"));
  assert.ok(readme.includes("YOUR_GITHUB_TOKEN"));
  assert.ok(!readme.includes("@marsx/ai-coding-workflow-toolkit"));
});
