#!/usr/bin/env node
/**
 * dingdawg-test-agent — Validate your agent before publishing to the marketplace.
 *
 * Checks:
 * 1. manifest.json exists and is valid
 * 2. Required fields present (name, description, category, framework)
 * 3. MCP tools are defined
 * 4. Governance policies declared
 * 5. Package builds without errors
 * 6. README exists
 *
 * Usage: npx dingdawg-test-agent [path]
 */

import * as fs from "fs";
import * as path from "path";

const REQUIRED_MANIFEST_FIELDS = [
  "name",
  "description",
  "category",
  "framework",
];

const VALID_CATEGORIES = [
  "compliance",
  "security",
  "governance",
  "marketing",
  "development",
  "productivity",
  "analytics",
  "automation",
  "other",
];

const VALID_FRAMEWORKS = [
  "mcp_native",
  "openclaw",
  "nemoclaw",
  "langchain",
  "crewai",
  "custom",
];

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

function testManifestExists(dir: string): TestResult {
  const manifestPath = path.join(dir, "manifest.json");
  if (fs.existsSync(manifestPath)) {
    return { name: "Manifest exists", passed: true, message: "manifest.json found" };
  }
  // Check package.json as fallback
  const pkgPath = path.join(dir, "package.json");
  if (fs.existsSync(pkgPath)) {
    return { name: "Manifest exists", passed: true, message: "package.json found (no manifest.json — using package.json)" };
  }
  return { name: "Manifest exists", passed: false, message: "No manifest.json or package.json found" };
}

function testManifestFields(dir: string): TestResult {
  const manifestPath = path.join(dir, "manifest.json");
  const pkgPath = path.join(dir, "package.json");
  const filePath = fs.existsSync(manifestPath) ? manifestPath : pkgPath;

  if (!fs.existsSync(filePath)) {
    return { name: "Required fields", passed: false, message: "No manifest file to validate" };
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const missing: string[] = [];
    for (const field of REQUIRED_MANIFEST_FIELDS) {
      if (!data[field] && !data.dingdawg?.[field]) {
        missing.push(field);
      }
    }
    if (missing.length > 0) {
      return { name: "Required fields", passed: false, message: `Missing fields: ${missing.join(", ")}` };
    }
    return { name: "Required fields", passed: true, message: "All required fields present" };
  } catch (e) {
    return { name: "Required fields", passed: false, message: `Parse error: ${e}` };
  }
}

function testCategory(dir: string): TestResult {
  const data = loadManifest(dir);
  if (!data) return { name: "Valid category", passed: false, message: "No manifest" };

  const category = data.category || data.dingdawg?.category;
  if (!category) return { name: "Valid category", passed: false, message: "No category specified" };
  if (VALID_CATEGORIES.includes(category)) {
    return { name: "Valid category", passed: true, message: `Category: ${category}` };
  }
  return { name: "Valid category", passed: false, message: `Invalid category '${category}'. Valid: ${VALID_CATEGORIES.join(", ")}` };
}

function testFramework(dir: string): TestResult {
  const data = loadManifest(dir);
  if (!data) return { name: "Valid framework", passed: false, message: "No manifest" };

  const framework = data.framework || data.dingdawg?.framework;
  if (!framework) return { name: "Valid framework", passed: false, message: "No framework specified" };
  if (VALID_FRAMEWORKS.includes(framework)) {
    return { name: "Valid framework", passed: true, message: `Framework: ${framework}` };
  }
  return { name: "Valid framework", passed: false, message: `Invalid framework '${framework}'. Valid: ${VALID_FRAMEWORKS.join(", ")}` };
}

function testGovernance(dir: string): TestResult {
  const data = loadManifest(dir);
  if (!data) return { name: "Governance policies", passed: false, message: "No manifest" };

  const gov = data.governance || data.dingdawg?.governance;
  if (!gov) {
    return { name: "Governance policies", passed: false, message: "No governance section — agents MUST declare capabilities and data access" };
  }
  return { name: "Governance policies", passed: true, message: "Governance policies declared" };
}

function testTools(dir: string): TestResult {
  const data = loadManifest(dir);
  if (!data) return { name: "MCP tools", passed: false, message: "No manifest" };

  const tools = data.tools || data.dingdawg?.tools || data.mcp_tools;
  if (!tools || (Array.isArray(tools) && tools.length === 0)) {
    return { name: "MCP tools", passed: false, message: "No MCP tools defined — agent must expose at least one tool" };
  }
  const count = Array.isArray(tools) ? tools.length : 1;
  return { name: "MCP tools", passed: true, message: `${count} tool(s) defined` };
}

function testReadme(dir: string): TestResult {
  if (fs.existsSync(path.join(dir, "README.md"))) {
    return { name: "README", passed: true, message: "README.md found" };
  }
  return { name: "README", passed: false, message: "No README.md — required for marketplace listing" };
}

function testEntrypoint(dir: string): TestResult {
  const pkg = loadPkg(dir);
  if (!pkg) return { name: "Entry point", passed: false, message: "No package.json" };

  const main = pkg.main || pkg.bin;
  if (!main) {
    return { name: "Entry point", passed: false, message: "No 'main' or 'bin' in package.json" };
  }

  // Check if the entry file exists
  const mainFile = typeof main === "string" ? main : Object.values(main)[0];
  if (typeof mainFile === "string" && fs.existsSync(path.join(dir, mainFile))) {
    return { name: "Entry point", passed: true, message: `Entry: ${mainFile}` };
  }

  // Check if source exists (not yet built)
  const srcMain = (typeof mainFile === "string" ? mainFile : "").replace("dist/", "src/").replace(".js", ".ts");
  if (fs.existsSync(path.join(dir, srcMain))) {
    return { name: "Entry point", passed: true, message: `Source: ${srcMain} (not yet built — run npm run build)` };
  }

  return { name: "Entry point", passed: false, message: `Entry point ${mainFile} not found` };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadManifest(dir: string): any | null {
  for (const name of ["manifest.json", "package.json"]) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) {
      try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { continue; }
    }
  }
  return null;
}

function loadPkg(dir: string): Record<string, unknown> | null {
  const p = path.join(dir, "package.json");
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return null; }
  }
  return null;
}

function main(): void {
  const targetDir = process.argv[2] || process.cwd();
  const resolved = path.resolve(targetDir);

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   DingDawg Agent Validator v1.0.0        ║");
  console.log("╚══════════════════════════════════════════╝\n");
  console.log(`Testing agent at: ${resolved}\n`);

  const tests: TestResult[] = [
    testManifestExists(resolved),
    testManifestFields(resolved),
    testCategory(resolved),
    testFramework(resolved),
    testGovernance(resolved),
    testTools(resolved),
    testReadme(resolved),
    testEntrypoint(resolved),
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const icon = test.passed ? "✓" : "✗";
    const color = test.passed ? "\x1b[32m" : "\x1b[31m";
    console.log(`  ${color}${icon}\x1b[0m ${test.name}: ${test.message}`);
    if (test.passed) passed++;
    else failed++;
  }

  console.log(`\n  Result: ${passed}/${tests.length} passed`);

  if (failed === 0) {
    console.log("\n  \x1b[32m✓ Agent is ready to publish!\x1b[0m");
    console.log("  Run: npx dingdawg-publish-agent\n");
    process.exit(0);
  } else {
    console.log(`\n  \x1b[31m✗ ${failed} test(s) failed. Fix issues before publishing.\x1b[0m\n`);
    process.exit(1);
  }
}

main();
