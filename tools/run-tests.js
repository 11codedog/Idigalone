const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const rootDir = path.resolve(__dirname, '..');
const tests = [];

require.extensions['.ts'] = function registerTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2015,
      module: ts.ModuleKind.CommonJS,
      experimentalDecorators: true,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

global.test = function defineTest(name, run) {
  tests.push({ name, run });
};

function loadTests(directory) {
  for (const entry of fs.readdirSync(directory)) {
    const fullPath = path.join(directory, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      loadTests(fullPath);
    } else if (entry.endsWith('.test.js')) {
      require(fullPath);
    }
  }
}

async function runAll() {
  loadTests(path.join(rootDir, 'tests'));

  let failed = 0;
  for (const item of tests) {
    try {
      await item.run();
      console.log(`✓ ${item.name}`);
    } catch (error) {
      failed += 1;
      console.error(`✗ ${item.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
    console.error(`${failed}/${tests.length} tests failed.`);
    return;
  }

  console.log(`${tests.length} tests passed.`);
}

void runAll();
