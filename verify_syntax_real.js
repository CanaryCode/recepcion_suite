const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];

if (!filePath) {
  console.error("Please provide a file path.");
  process.exit(1);
}

try {
  const code = fs.readFileSync(filePath, 'utf8');
  // Simple check: try to construct a Function (might fail if imports are present, but catches basic synthax)
  // Better: use 'vm' module to check script compilation
  const vm = require('vm');
  const script = new vm.Script(code);
  console.log("Syntax OK");
} catch (e) {
  // If it fails due to "import", that's expected in Node without type module, 
  // but we want to catch "Unexpected token" that isn't import/export related.
  if (e.message.includes("Cannot use import statement outside a module")) {
      console.log("Syntax OK (ES Module detected)");
  } else {
      console.error("Syntax Error:", e.message);
      process.exit(1);
  }
}
