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

// Gem files are handed to esbuild under a virtual path rather than their location
// on disk, because esbuild puts the paths it is given into what it emits: as the
// `/* source */` banner atop a bundle, and as the output filename of anything
// copied out. Real paths would publish the build machine's directory layout in
// assets served to browsers.
const GEM_ASSET_NAMESPACE = 'gem-asset'

// Assets that become an output file of their own, named after the path esbuild
// was given, rather than being parsed and inlined into a bundle.
const EMITTED_ASSET = /\.(?:eot|ttf|woff2?|png|jpe?g|gif|svg|webp|ico|avif)$/i

function gemAssetSpecifier(gem, relativeToRoot) {
  return `${GEM_ASSET_NAMESPACE}:${gem}/${relativeToRoot}`
}

function gemAssetLoader(file) {
  if (path.extname(file) === '.css') return 'css'

  return EMITTED_ASSET.test(file) ? 'file' : 'js'
}

// Expand a `some/dir/base.*` glob into the concrete files it matches. Source maps
// are skipped: esbuild regenerates its own.
function expandSource(root, sourceGlob) {
  const directory = path.join(root, path.dirname(sourceGlob))
  const pattern = path.basename(sourceGlob)

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
const gemAssetPaths = [] // { gem, root, assetPaths: [relative to gem root, ...] }

for (const mapping of gemAssetMappings) {
  if (!mapping.railsEnvironments.includes(railsEnv)) continue

  const root = gemRoot(mapping.gem)
  if (!root) continue

  gemAssetPaths.push({
    gem: mapping.gem,
    root,
    // Longest first, so the most specific asset path wins when several nest.
    assetPaths: mapping.assetPaths
      .map(assetPath => assetPath.path)
      .sort((a, b) => b.length - a.length),
  })

  for (const { sourceGlob, logicalName } of mapping.manifestEntries) {
    for (const file of expandSource(root, sourceGlob)) {
      const stem = path.basename(file, path.extname(file))

      mappedEntryPoints.push({
        // Images and fonts are copied verbatim to the name `logicalName` gives
        // them, so nothing of their origin survives and they can be read straight
        // off disk. Anything esbuild parses gets a `/* source */` banner naming
        // the file it came from, which is why those go through a virtual path.
        in: EMITTED_ASSET.test(file) ? file : gemAssetSpecifier(mapping.gem, path.relative(root, file)),
        out: logicalName.replace('*', stem),
      })
    }
  }
}

// Resolves gem-owned assets the way a Rails asset pipeline would have on the
// gem's behalf. Scoped to files that came from a gem, so the app's own assets
// keep esbuild's normal resolution.
const gemAssetResolver = {
  name: 'gemAssetResolver',
  setup(build) {
    function gemAsset(owner, relativeToRoot, virtualPath) {
      return {
        path: virtualPath,
        namespace: GEM_ASSET_NAMESPACE,
        pluginData: {
          gem: owner.gem,
          relativeToRoot,
          file: path.join(owner.root, relativeToRoot),
        },
      }
    }

    // Entry points, named by config/asset_mappings.json.
    build.onResolve({ filter: new RegExp(`^${GEM_ASSET_NAMESPACE}:`) }, ({ path: specifier }) => {
      const virtualPath = specifier.slice(GEM_ASSET_NAMESPACE.length + 1)
      const separator = virtualPath.indexOf('/')
      const gem = virtualPath.slice(0, separator)
      const owner = gemAssetPaths.find(candidate => candidate.gem === gem)

      return gemAsset(owner, virtualPath.slice(separator + 1), virtualPath)
    })

    // Anything those files go on to reference. A gem stylesheet asking for
    // `url(fonts/foo.woff2)` does not mean a sibling file: it means the *logical*
    // path `<its own logical directory>/fonts/foo.woff2`, looked up across every
    // one of the gem's asset paths. esbuild knows only relative and node
    // resolution, so do that lookup here.
    build.onResolve(
      { filter: /.*/, namespace: GEM_ASSET_NAMESPACE },
      ({ path: requested, pluginData }) => {
        const owner = gemAssetPaths.find(candidate => candidate.gem === pluginData.gem)
        const base = owner.assetPaths.find(assetPath =>
          pluginData.relativeToRoot.startsWith(assetPath + path.sep)
        )
        if (!base) return

        const logicalDirectory = path.dirname(path.relative(base, pluginData.relativeToRoot))
        const logical = path.normalize(
          path.join(logicalDirectory, requested.replace(/[?#].*$/, ''))
        )

        for (const assetPath of owner.assetPaths) {
          const relativeToRoot = path.join(assetPath, logical)
          if (!fs.existsSync(path.join(owner.root, relativeToRoot))) continue

          // esbuild drops the directory of a virtual path when naming an output,
          // so emitted assets get a flattened name qualified by their gem, both
          // to stay readable and to not collide with the app's own assets.
          const virtualPath = EMITTED_ASSET.test(logical)
            ? `${owner.gem}--${logical.replaceAll(path.sep, '-')}`
            : `${owner.gem}/${relativeToRoot}`

          return gemAsset(owner, relativeToRoot, virtualPath)
        }
      }
    )

    build.onLoad({ filter: /.*/, namespace: GEM_ASSET_NAMESPACE }, ({ pluginData }) => ({
      contents: fs.readFileSync(pluginData.file),
      loader: gemAssetLoader(pluginData.file),
      pluginData,
    }))
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
    gemAssetResolver,
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
