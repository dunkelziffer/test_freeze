"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var index_exports = {};
__export(index_exports, {
  default: () => manifestPlugin
});
module.exports = __toCommonJS(index_exports);
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
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
      const manifestFilePath = (0, import_node_path.join)(outdir, filename);
      const relativeOutDir = (0, import_node_path.relative)(absWorkingDir, outdir);
      build.initialOptions.metafile = true;
      function generateManifest(outputs) {
        return {
          ...getEntryPointsManifest(outputs),
          ...getAssetsManifest(outputs)
        };
      }
      function getEntryPointsManifest(outputs) {
        const manifest = {};
        const paths = Object.keys(outputs).map((outputPath) => (0, import_node_path.relative)(relativeOutDir, outputPath));
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
            manifest[sourcePath] = (0, import_node_path.relative)(relativeOutDir, buildPath);
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
          (0, import_node_fs.writeFileSync)(manifestFilePath, json);
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
module.exports = Object.assign(module.exports.default, module.exports);
//# sourceMappingURL=index.cjs.map
