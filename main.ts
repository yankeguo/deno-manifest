// Directory name pattern: exclude names starting with "." or "_", and "node_modules"
const dirDenyPattern = /^[._]|^node_modules$/i;

// File name pattern: only allow .ts/.mts files, exclude those starting with "." or "_",
// and exclude .d.ts, .d.mts, _test.ts, _test.mts files
const filePattern = /^(?![._]).*\.m?ts$/i;
const fileDenyPattern = /(?:\.d\.m?ts|_test\.m?ts)$/i;

function shouldIncludeDir(name: string): boolean {
  return !dirDenyPattern.test(name);
}

function shouldIncludeFile(name: string): boolean {
  return filePattern.test(name) && !fileDenyPattern.test(name);
}

async function* walkFiles(
  dir: string,
  depth: number,
): AsyncGenerator<string> {
  if (depth < 0) return;

  try {
    for await (const entry of Deno.readDir(dir)) {
      const path = `${dir}/${entry.name}`;

      if (entry.isDirectory && shouldIncludeDir(entry.name)) {
        yield* walkFiles(path, depth - 1);
      } else if (entry.isFile && shouldIncludeFile(entry.name)) {
        yield path;
      }
    }
  } catch (error) {
    // Log error but continue processing other directories
    console.error(`Error reading directory ${dir}:`, error);
  }
}

function createScript(files: string[], rootPath: string): string {
  const imports: string[] = [];
  const exports: string[] = [];

  files.forEach((file, index) => {
    const importPath = "./" + file.slice(rootPath.length + 1);
    imports.push(`import * as file_${index} from "${importPath}";`);
    exports.push(
      `  if (file_${index}.default) await add(file_${index}.default);`,
    );
  });

  return [
    ...imports,
    "",
    "const items = [];",
    "",
    "async function add(item) {",
    "  if (typeof item === 'function') {",
    "    item = await item();",
    "  }",
    "  if (Array.isArray(item)) {",
    "    items.push(...item);",
    "  } else {",
    "    items.push(item);",
    "  }",
    "}",
    "",
    ...exports,
    "",
    "const output = JSON.stringify({ apiVersion: 'v1', kind: 'List', items }, null, 2);",
    "await Deno.stdout.write(new TextEncoder().encode(output));",
  ].join("\n");
}

async function executeScript(script: string): Promise<void> {
  const cmd = new Deno.Command(Deno.execPath(), {
    args: ["run", "-A", "-"],
    stdin: "piped",
    stdout: "inherit",
    stderr: "inherit",
  });

  const proc = cmd.spawn();
  const writer = proc.stdin.getWriter();

  try {
    await writer.write(new TextEncoder().encode(script));
  } finally {
    await writer.close();
  }

  const status = await proc.status;
  if (!status.success) {
    throw new Error(`Script execution failed with code ${status.code}`);
  }
}

async function main() {
  const root = Deno.cwd();
  const files: string[] = [];

  // Collect all matching files
  for await (const file of walkFiles(root, 10)) {
    files.push(file);
  }

  if (files.length === 0) {
    console.warn("No matching files found");
    return;
  }

  // Generate and execute the import script
  const script = createScript(files, root);

  try {
    await executeScript(script);
  } catch (error) {
    console.error("Failed to execute script:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
