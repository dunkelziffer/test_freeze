import { writeFileSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import type { BuildOptions, Metafile, Plugin } from 'esbuild'

type Outputs = Metafile['outputs']
type Manifest = Record<string, string | undefined>

interface EntryPoint {
  /** Input path as configured; may be absolute or relative to `absWorkingDir`. */
  input: string
  /** Declared output name; manifest keys are derived from it. */
  name: string
}

export interface ManifestPluginOptions {
  /** Manifest filename written into `outdir`. Default: `"manifest.json"`. */
  filename?: string
  /**
   * Prefix applied to non-entrypoint assets whose input path lives inside a
   * `node_modules/` directory. Pass `false` to keep the original path.
   * Default: `""` (strips the `node_modules/` prefix).
   */
  nodeModulesPrefix?: string | false
}

const defaultOptions = {
  filename: 'manifest.json',
  nodeModulesPrefix: '' as string | false,
} satisfies Required<ManifestPluginOptions>

const name = 'manifestPlugin'

export default function manifestPlugin(options: ManifestPluginOptions = {}): Plugin {
  const { filename, nodeModulesPrefix } = { ...defaultOptions, ...options }

  return {
    name,
    setup(build) {
      const { entryPoints, outdir, absWorkingDir } = build.initialOptions

      if (outdir === undefined) {
        throw buildError('outdir option is required')
      }
      if (absWorkingDir === undefined) {
        throw buildError('absWorkingDir option is required')
      }

      const entries = collectEntryPoints(entryPoints)

      // Keyed the way esbuild reports entry points in the metafile, so outputs
      // can be traced back to the entry that declared them.
      const entriesByInput = new Map<string, EntryPoint>(
        entries.map(entry => [relative(absWorkingDir, resolve(absWorkingDir, entry.input)), entry]),
      )

      const manifestFilePath = join(outdir, filename)
      const relativeOutDir = relative(absWorkingDir, outdir)

      build.initialOptions.metafile = true

      function generateManifest(outputs: Outputs): Manifest {
        return {
          ...getEntryPointsManifest(outputs),
          ...getAssetsManifest(outputs),
        }
      }

      function getEntryPointsManifest(outputs: Outputs): Manifest {
        const manifest: Manifest = {}
        const paths = Object.keys(outputs).map(outputPath => relative(relativeOutDir, outputPath))

        for (const { name: entrypoint } of entries) {
          const name = entrypoint.replace(/\.js$/, '')
          const escapedName = name.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')
          const hashRegex = '[A-Z0-9]{8,}'

          const jsRegExp = new RegExp(`^${escapedName}(-${hashRegex})?\\.js$`)
          const cssRegExp = new RegExp(`^${escapedName}(-${hashRegex})?\\.css$`)

          const jsPath = paths.find(path => jsRegExp.test(path))
          const cssPath = paths.find(path => cssRegExp.test(path))

          manifest[`${name}.js`] = jsPath
          manifest[`${name}.css`] = cssPath
        }

        // The pass above can only guess at the JS/CSS pair an entry name implies,
        // which is all an entry point used to be able to produce. An entry point
        // can also be an image or a font (loader: 'copy' / 'file'), so match those
        // through the metafile, which names the entry each output came from, and
        // key them by the declared output name plus the extension esbuild chose.
        for (const [outputPath, { entryPoint }] of Object.entries(outputs)) {
          if (entryPoint === undefined) continue

          const entry = entriesByInput.get(entryPoint)
          if (entry === undefined) continue

          const name = entry.name.replace(/\.js$/, '')
          manifest[`${name}${extname(outputPath)}`] = relative(relativeOutDir, outputPath)
        }

        return manifest
      }

      function getAssetsManifest(outputs: Outputs): Manifest {
        const manifest: Manifest = {}

        for (const [buildPath, { entryPoint, inputs }] of Object.entries(outputs)) {
          const sourcePaths = Object.keys(inputs)

          if (!entryPoint && sourcePaths.length === 1) {
            const [rawPath] = sourcePaths as [string]
            const sourcePath =
              nodeModulesPrefix === false
                ? rawPath
                : rawPath.replace(/^([^/]+\/)*?node_modules\//, nodeModulesPrefix)
            manifest[sourcePath] = relative(relativeOutDir, buildPath)
          }
        }

        return manifest
      }

      function serializeManifest(manifest: Manifest): string {
        return JSON.stringify(manifest, null, 2)
      }

      build.onEnd(result => {
        if (result.metafile) {
          const manifest = generateManifest(result.metafile.outputs)
          const json = serializeManifest(manifest)

          writeFileSync(manifestFilePath, json)
        }
      })
    },
  }
}

function buildError(message: string): Error {
  return new Error(`${name}: ${message}`)
}

// Normalises the three forms that esbuild accepts for `entryPoints` into a flat
// list of input/output pairs so the rest of the plugin can iterate uniformly.
//
// Array example:
//   entryPoints: ['home.ts', 'settings.ts'],
//
// Array of objects example
//   entryPoints: [
//     { out: 'out1', in: 'home.ts'},
//     { out: 'out2', in: 'settings.ts'},
//   ],
//
// Plain object example
//   entryPoints: { bundle: 'application.ts' },
//
// See https://esbuild.github.io/api/#entry-points
// (and https://github.com/evanw/esbuild/blob/6a794dff68e6a43539f6da671e3080efdf11ca70/lib/shared/common.ts#L362 for the last undocumented variant)

function collectEntryPoints(entryPoints: BuildOptions['entryPoints']): EntryPoint[] {
  if (entryPoints === undefined) {
    throw buildError('entryPoints option is required')
  }
  if (Array.isArray(entryPoints)) {
    return entryPoints.map(entry =>
      typeof entry === 'string'
        ? { input: entry, name: entry }
        : { input: entry.in, name: entry.out },
    )
  }
  return Object.entries(entryPoints).map(([name, input]) => ({ input, name }))
}
