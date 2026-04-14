import { build, context, formatMessages } from 'esbuild'
import esbuildPluginImportGlob from 'esbuild-plugin-import-glob'
import esbuildPluginTextReplace from 'esbuild-plugin-text-replace'
// import manifestPlugin from 'esbuild-manifest-plugin'
const { default: importGlob } = esbuildPluginImportGlob

const path = await import('path')
const fs = await import('fs')

const railsEnv = process.env.RAILS_ENV || 'development'
const outdir = path.join(process.cwd(), 'app/assets/builds')
const errorFilePath = path.join(outdir, `esbuild_error_${railsEnv}.txt`)

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

const externalImagesPlugin = {
  name: 'external-images',
  setup(build) {
    build.onResolve({ filter: /\.(png|jpe?g|svg|webp|ico|woff2?|ttf)$/ }, args => {
      // If it's coming from node_modules → bundle it
      if (args.path.includes('node_modules')) return;

      // Otherwise mark as external
      return {
        path: path.resolve(args.resolveDir, args.path),
        external: true,
      };
    });
  },
};

const config = {
  entryPoints: ['app/assets/*.js'],
  bundle: true,
  sourcemap: true,
  format: 'esm',
  // absWorkingDir: process.cwd(), // required for manifest plugin to generate correct paths
  outdir,
  publicPath: '/assets',
  entryNames: '[dir]/[name]',
  assetNames: '[dir]/[name]',
  // external: ['*.ico', '*.jpg', '*.png', '*.svg', '*.webp', '*.json', '*.ttf', '*.woff', '*.woff2'],
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
    externalImagesPlugin,
    esbuildPluginTextReplace({
      include: /jasmine-core\/lib\/jasmine-core\/jasmine\.js/,
      pattern: [
        ['let jasmineRequire;', 'let jasmineRequire; const global = window;'],
      ]
    }),
    importGlob(),
    // manifestPlugin(),
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
