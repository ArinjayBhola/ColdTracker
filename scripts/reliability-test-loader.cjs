const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Compile in memory so checks exercise the real TypeScript without a test build
// or importing the production database and email clients.
module.exports = function createLoader(mocks = {}) {
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    function resolve(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith("@/") || name.startsWith(".")) {
        const base = name.startsWith("@/") ? path.resolve(name.slice(2)) : path.resolve(path.dirname(filename), name);
        for (const extension of [".ts", ".tsx"]) if (fs.existsSync(base + extension)) return load(base + extension);
      }
      return require(name);
    }
    new Function("require", "module", "exports", output)(resolve, module, module.exports);
    return module.exports;
  }
  return load;
};
