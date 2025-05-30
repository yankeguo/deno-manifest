// Directory name pattern: exclude names starting with "." or "_", and "node_modules"
const dirDenyPattern = /^[._]|^node_modules$/i;

function checkDirName(name: string) {
  return !dirDenyPattern.test(name);
}

// File name pattern: only allow .ts/.mts files, exclude those starting with "." or "_",
// and exclude .d.ts, .d.mts, _test.ts, _test.mts files
const fileAllowPattern = /^[^._].*\.m?ts$/i;
const fileDenyPattern = /\.d\.m?ts$|_test\.m?ts$/i;

function checkFileName(name: string) {
  return fileAllowPattern.test(name) && !fileDenyPattern.test(name);
}

async function walk(dir: string, depth: number, files: string[]) {
  if (depth < 0) {
    return;
  }
  for await (const file of Deno.readDir(dir)) {
    if (file.isDirectory) {
      if (checkDirName(file.name)) {
        await walk(dir + "/" + file.name, depth - 1, files);
      }
    } else {
      if (checkFileName(file.name)) {
        files.push(dir + "/" + file.name);
      }
    }
  }
}

async function main() {
  // Get all files in the current directory
  const root = Deno.cwd();
  const files: string[] = [];
  await walk(root, 10, files);
  // Generate script to import and eval all files
  const script: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const importPath = "./" + file.substring(root.length + 1);
    script.push(`import * as file_${i} from "${importPath}";`);
  }
  script.push(`
const items: any[] = [];

async function add(item: any) {
  if (typeof item === "function") {
     items.push(await item());
  } else {
    if (Array.isArray(item)) {
      items.push(...item);
    } else {
      items.push(item);
    }
  }
}
`);

  for (let i = 0; i < files.length; i++) {
    script.push(`if (file_${i}.default) await add(file_${i}.default);`);
  }

  script.push(
    ``,
    `await Deno.stdout.write(new TextEncoder().encode(JSON.stringify({ apiVersion: "v1", kind: "List", items }, null, 2)));`,
  );

  // eval the script with child process
  const cmd = new Deno.Command(
    Deno.execPath(),
    {
      args: [
        "run",
        "-A",
        "-",
      ],
      stdin: "piped",
      stdout: "inherit",
      stderr: "inherit",
    },
  );

  const proc = cmd.spawn();

  const stdin = proc.stdin.getWriter();
  await stdin.write(new TextEncoder().encode(script.join("\n")));
  await stdin.close();

  await proc.status;
}

if (import.meta.main) {
  await main();
}
