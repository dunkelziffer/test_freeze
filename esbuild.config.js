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

// Avo 4 no longer ships a `public/` dir, so its built CSS/JS have to come out of
// the gem itself. Resolve the gem root here and alias it as `avo-gem` so the
// shim entry points in app/assets/avo/ can import from it without hardcoding a
// version-specific path. Avo is development/test-only, so tolerate its absence.
let avoGemRoot = null
try {
  avoGemRoot = execFileSync('bundle', ['show', 'avo'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()
} catch {
  avoGemRoot = null
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
  entryPoints = ['application.js', 'static.js', 'jasmine.js']
}

if (avoGemRoot) {
  entryPoints.push(
    'avo/application.js',
    'avo/dependencies.js',
    'avo/late-registration.js',
    'avo-overrides.js',
  )
}

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
  alias: avoGemRoot ? { 'avo-gem': avoGemRoot } : {},
  // Avo's stylesheet references its webfonts as `url(fonts/…)`, relative to a
  // directory they aren't actually in — Sprockets/Propshaft resolve that through
  // the asset load path, which we don't have. Leaving them external keeps the
  // URLs untouched; config/initializers/avo.rb serves them from the gem.
  external: ['fonts/*'],
  loader: {
    '.css': 'css',
    '.ico': 'copy',
    '.jpg': 'copy',
    '.png': 'copy',
    '.svg': 'copy',
    '.webp': 'copy',
    '.json': 'copy',
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
