import type { Plugin } from 'esbuild';
export interface ManifestPluginOptions {
    /** Manifest filename written into `outdir`. Default: `"manifest.json"`. */
    filename?: string;
    /**
     * Prefix applied to non-entrypoint assets whose input path lives inside a
     * `node_modules/` directory. Pass `false` to keep the original path.
     * Default: `""` (strips the `node_modules/` prefix).
     */
    nodeModulesPrefix?: string | false;
}
export default function manifestPlugin(options?: ManifestPluginOptions): Plugin;
