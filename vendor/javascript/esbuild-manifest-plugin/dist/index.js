import { writeFileSync } from "node:fs";
import { join, relative } from "node:path";
const defaultOptions = {
  filename: "manifest.json",
  nodeModulesPrefix: ""
};
const name = "manifestPlugin";
function manifestPlugin(options = {}) {
  const { filename, nodeModulesPrefix } = { ...defaultOptions, ...options };
  return {
    name,
    setup(build) {
      const { entryPoints, outdir, absWorkingDir } = build.initialOptions;
      if (outdir === void 0) {
        throw buildError("outdir option is required");
      }
      if (absWorkingDir === void 0) {
        throw buildError("absWorkingDir option is required");
      }
      const entryNames = collectEntryNames(entryPoints);
      const manifestFilePath = join(outdir, filename);
      const relativeOutDir = relative(absWorkingDir, outdir);
      build.initialOptions.metafile = true;
      function generateManifest(outputs) {
        return {
          ...getEntryPointsManifest(outputs),
          ...getAssetsManifest(outputs)
        };
      }
      function getEntryPointsManifest(outputs) {
        const manifest = {};
        const paths = Object.keys(outputs).map((outputPath) => relative(relativeOutDir, outputPath));
        for (const entrypoint of entryNames) {
          const name2 = entrypoint.replace(/\.js$/, "");
          const escapedName = name2.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&");
          const hashRegex = "[A-Z0-9]{8,}";
          const jsRegExp = new RegExp(`^${escapedName}(-${hashRegex})?\\.js$`);
          const cssRegExp = new RegExp(`^${escapedName}(-${hashRegex})?\\.css$`);
          const jsPath = paths.find((path) => jsRegExp.test(path));
          const cssPath = paths.find((path) => cssRegExp.test(path));
          manifest[`${name2}.js`] = jsPath;
          manifest[`${name2}.css`] = cssPath;
        }
        return manifest;
      }
      function getAssetsManifest(outputs) {
        const manifest = {};
        for (const [buildPath, { entryPoint, inputs }] of Object.entries(outputs)) {
          const sourcePaths = Object.keys(inputs);
          if (!entryPoint && sourcePaths.length === 1) {
            const [rawPath] = sourcePaths;
            const sourcePath = nodeModulesPrefix === false ? rawPath : rawPath.replace(/^([^/]+\/)*?node_modules\//, nodeModulesPrefix);
            manifest[sourcePath] = relative(relativeOutDir, buildPath);
          }
        }
        return manifest;
      }
      function serializeManifest(manifest) {
        return JSON.stringify(manifest, null, 2);
      }
      build.onEnd((result) => {
        if (result.metafile) {
          const manifest = generateManifest(result.metafile.outputs);
          const json = serializeManifest(manifest);
          writeFileSync(manifestFilePath, json);
        }
      });
    }
  };
}
function buildError(message) {
  return new Error(`${name}: ${message}`);
}
function collectEntryNames(entryPoints) {
  if (entryPoints === void 0) {
    throw buildError("entryPoints option is required");
  }
  if (Array.isArray(entryPoints)) {
    return entryPoints.map((entry) => typeof entry === "string" ? entry : entry.out);
  }
  return Object.keys(entryPoints);
}
export {
  manifestPlugin as default
};
//# sourceMappingURL=index.js.map
