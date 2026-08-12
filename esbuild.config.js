import { build, context, formatMessages } from 'esbuild'
import esbuildPluginImportGlob from 'esbuild-plugin-import-glob'
import esbuildPluginTextReplace from 'esbuild-plugin-text-replace'
import manifestPlugin from 'esbuild-manifest-plugin'
const { default: importGlob } = esbuildPluginImportGlob

const path = await import('path')
const fs = await import('fs')
const { execFileSync } = await import('child_process')

const railsEnv = process.env.RAILS_ENV || 'development'
const assetsRoot = path.join(process.cwd(), 'app/assets')
const outdir = path.join(process.cwd(), 'public/assets')
const errorFilePath = path.join(outdir, `esbuild_error_${railsEnv}.txt`)

// Some gems ship assets expecting a Rails asset pipeline to serve them (Avo 4
// dropped its `public/` dir and does exactly this). We have no pipeline, so those
// assets are declared in config/asset_mappings.json and pulled into this build.
// That file is the single source of truth, shared with the audit test on the Ruby
// side; locating the gems is the only link between the two processes.
const { gems: gemAssetMappings } = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'config/asset_mappings.json'), 'utf8')
)

function gemRoot(name) {
  try {
    return execFileSync('bundle', ['info', name, '--path'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null // not in this bundle (Avo is development/test-only)
  }
}

// Expand a `some/dir/base.*` source into the concrete files it matches. Source
// maps are skipped: esbuild regenerates its own.
function expandSource(root, source) {
  const directory = path.join(root, path.dirname(source))
  const pattern = path.basename(source)

  if (!pattern.includes('*')) {
    return fs.existsSync(path.join(directory, pattern)) ? [path.join(directory, pattern)] : []
  }

  const matcher = new RegExp(`^${pattern.replace(/[.]/g, '\\.').replace(/\*/g, '.*')}$`)

  return fs
    .readdirSync(directory)
    .filter(entry => matcher.test(entry) && !entry.endsWith('.map'))
    .map(entry => path.join(directory, entry))
    .filter(file => fs.statSync(file).isFile())
}

const mappedEntryPoints = []
const gemLoadPaths = [] // [gemRoot, [absolute load path, ...]]

for (const mapping of gemAssetMappings) {
  if (!mapping.railsEnvironments.includes(railsEnv)) continue

  const root = gemRoot(mapping.gem)
  if (!root) continue

  gemLoadPaths.push([root, mapping.loadPaths.map(relative => path.join(root, relative))])

  for (const { source, target } of mapping.entries) {
    for (const file of expandSource(root, source)) {
      const stem = path.basename(file, path.extname(file))
      mappedEntryPoints.push({ in: file, out: target.replace('*', stem) })
    }
  }
}

// Reproduces the load path lookup a pipeline would do on the gem's behalf. A gem
// stylesheet referencing `url(fonts/foo.woff2)` means the *logical* path
// `<its own logical dir>/fonts/foo.woff2`, resolved against every registered load
// path — not a sibling file. esbuild only knows relative and node resolution, so
// without this the reference fails to resolve. Keyed off the importer, so the
// app's own assets keep esbuild's normal resolution.
const gemAssetLoadPaths = {
  name: 'gemAssetLoadPaths',
  setup(build) {
    build.onResolve({ filter: /.*/ }, ({ path: requested, importer }) => {
      if (!importer) return

      const owner = gemLoadPaths.find(([root]) => importer.startsWith(root + path.sep))
      if (!owner) return

      const [, loadPaths] = owner
      const base = loadPaths.find(loadPath => importer.startsWith(loadPath + path.sep))
      if (!base) return

      const logicalDirectory = path.dirname(path.relative(base, importer))
      const logical = path.normalize(
        path.join(logicalDirectory, requested.replace(/[?#].*$/, ''))
      )

      for (const loadPath of loadPaths) {
        const candidate = path.join(loadPath, logical)
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return { path: candidate }
        }
      }
    })
  },
}

if (!fs.existsSync(outdir)) { fs.mkdirSync(outdir) }

async function handleErrors(errors) {
  const formattedErrors = await formatMessages(errors, { kind: 'error' })
  const output = formattedErrors.join('\n')

  if (output) {
    fs.writeFileSync(errorFilePath, output)
  } else if (fs.existsSync(errorFilePath)) {
    fs.truncate(errorFilePath, 0, () => {})
  }
}

let entryPoints

if (railsEnv === 'production') {
  entryPoints = ['application.js', 'static.js']
} else {
  // avo-overrides is our own slot for customising Avo; its layout links it
  // unconditionally, so both the .js and the .css it imports have to exist.
  entryPoints = ['application.js', 'static.js', 'jasmine.js', 'avo-overrides.js']
}

entryPoints = [...entryPoints, ...mappedEntryPoints]

const config = {
  entryPoints,
  bundle: true,
  sourcemap: railsEnv !== 'production',
  format: 'esm',
  outdir,
  absWorkingDir: assetsRoot,
  // Pin the output base. It otherwise defaults to the lowest common ancestor of
  // the entry points, so adding or removing one can silently relocate every
  // output and break the manifest keys.
  outbase: assetsRoot,
  metafile: true,
  publicPath: '/assets',
  entryNames: '[dir]/[name]-[hash]',
  assetNames: '[dir]/[name]-[hash]',
  loader: {
    '.css': 'css',
    '.ico': 'copy',
    '.jpg': 'copy',
    '.png': 'copy',
    '.svg': 'copy',
    '.webp': 'copy',
    '.json': 'copy',
    '.eot': 'file',
    '.ttf': 'file',
    '.woff': 'file',
    '.woff2': 'file',
  },
  plugins: [
    esbuildPluginTextReplace({
      include: /jasmine-core\/lib\/jasmine-core\/jasmine\.js/,
      pattern: [
        ['let jasmineRequire;', 'let jasmineRequire; const global = window;'],
      ]
    }),
    importGlob(),
    gemAssetLoadPaths,
    manifestPlugin(),
    {
      name: 'handleErrors',
      setup: (build) => {
        build.onEnd(async ({ errors }) => {
          await handleErrors(errors)
        })
      }
    }
  ],
}

if (process.argv.includes('--watch')) {
  const ctx = await context(config)
  ctx.watch()
} else {
  await build(config)
}
