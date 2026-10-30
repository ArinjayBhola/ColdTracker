const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { test } = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "../lib/startup-validation.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const loaded = { exports: {} };
new Function("require", "module", "exports", compiled)(require, loaded, loaded.exports);
const { startupFormSchema, normalizeStartupName, startupWebsiteDomain } = loaded.exports;

function minimal() {
  return {
    name: "Example", description: "", website: "", logoUrl: "", sector: "", location: "", teamSize: "",
    fundingRound: "", fundingAmount: "", fundingDate: "", isHiring: false, isTrending: false,
    employees: [{ name: "Founder", role: "", email: "", linkedinUrl: "" }],
  };
}

test("only startup name and one named team member are required", () => {
  assert.equal(startupFormSchema.safeParse(minimal()).success, true);
  for (const input of [{ ...minimal(), name: " " }, { ...minimal(), employees: [] }, { ...minimal(), employees: [{ ...minimal().employees[0], name: " " }] }]) {
    assert.equal(startupFormSchema.safeParse(input).success, false);
  }
});

test("optional URLs are normalized, unsafe protocols and invalid contacts are rejected", () => {
  const input = minimal();
  input.website = "www.example.com";
  input.employees[0].linkedinUrl = "linkedin.com/in/founder";
  const result = startupFormSchema.parse(input);
  assert.equal(result.website, "https://www.example.com");
  assert.equal(result.employees[0].linkedinUrl, "https://linkedin.com/in/founder");
  for (const website of ["javascript:alert(1)", "ftp://example.com", "https://"]) assert.equal(startupFormSchema.safeParse({ ...minimal(), website }).success, false);
  for (const linkedinUrl of ["https://linkedin.com.attacker.test/in/user", "not a url"]) {
    assert.equal(startupFormSchema.safeParse({ ...minimal(), employees: [{ ...minimal().employees[0], linkedinUrl }] }).success, false);
  }
  assert.equal(startupFormSchema.safeParse({ ...minimal(), employees: [{ ...minimal().employees[0], email: "invalid" }] }).success, false);
});

test("invalid dates and tampered employee identifiers are rejected", () => {
  assert.equal(startupFormSchema.safeParse({ ...minimal(), fundingDate: "2026-02-30" }).success, false);
  assert.equal(startupFormSchema.safeParse({ ...minimal(), fundingDate: "2024-02-29" }).success, true);
  assert.equal(startupFormSchema.safeParse({ ...minimal(), employees: [{ ...minimal().employees[0], id: "bad" }] }).success, false);
});

test("duplicate keys ignore spacing, punctuation, case, URL paths and www", () => {
  assert.equal(normalizeStartupName(" Example, AI "), normalizeStartupName("example ai"));
  assert.equal(startupWebsiteDomain("https://www.Example.com/about"), startupWebsiteDomain("http://example.com/"));
  assert.equal(startupWebsiteDomain(null), "");
});
