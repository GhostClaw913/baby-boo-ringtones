import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const audioDir = path.join(projectRoot, 'assets', 'audio');
const outDir = path.join(projectRoot, 'src');
const outFile = path.join(outDir, 'tracks.generated.ts');

const SUPPORTED_EXTS = new Set(['.mp3', '.m4a', '.wav', '.ogg']);

function toTitle(fileName) {
  const base = fileName.replace(/\.[^.]+$/, '');
  const cleaned = base
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

const files = fs
  .readdirSync(audioDir)
  .filter((name) => SUPPORTED_EXTS.has(path.extname(name).toLowerCase()))
  .sort((a, b) => a.localeCompare(b));

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const items = files
  .map((fileName, i) => {
    const safe = fileName.replace(/'/g, "\\'");
    const title = toTitle(fileName).replace(/'/g, "\\'");
    return `  {\n    id: '${i + 1}',\n    title: '${title}',\n    subtitle: '${safe}',\n    fileName: '${safe}',\n    source: require('../assets/audio/${safe}'),\n  }`;
  })
  .join(',\n');

const content = `/* eslint-disable */\n/* AUTO-GENERATED FILE. DO NOT EDIT MANUALLY. */\n\nexport type GeneratedTrack = {\n  id: string;\n  title: string;\n  subtitle: string;\n  fileName: string;\n  source: number;\n};\n\nexport const GENERATED_TRACKS: GeneratedTrack[] = [\n${items}\n];\n`;

fs.writeFileSync(outFile, content);
console.log(`Generated ${files.length} track(s) -> ${path.relative(projectRoot, outFile)}`);
