# Local fork

Vendored fork of our in-house [esbuild-manifest-plugin](https://github.com/makandra/esbuild-manifest-plugin),
consumed from the working tree via `link:vendor/javascript/esbuild-manifest-plugin`
in the app's `package.json`.

**Forked at:** `945948f2c4b01552fe9ae8428993866149dcdd38` (v2.0.0, 2026-05-11)

## Why

Avo 4 stopped shipping a `public/` dir and now expects the host app's asset
pipeline to serve its assets. This app has no pipeline (esbuild + the
`precompiled_assets` gem), so Avo's assets have to be mapped into the esbuild
build explicitly. See `vendor/gems/precompiled_assets/FORK.md` for the Ruby half.

Upstream v2.0.0 already covers the biggest piece — it accepts esbuild's
`{ in, out }` entry point form, which lets out-of-tree sources (files inside a
gem) be given clean output names and manifest keys.

## Divergences from upstream

- `.gitignore`: `/dist/` is committed here. See the note in that file.

## Working on this fork

```sh
cd vendor/javascript/esbuild-manifest-plugin
npm install                     # upstream uses pnpm; either works
node build.mjs                  # rebuild dist/ after changing src/
npx vitest run test/manifest.test.ts
```

`test/dist.test.ts` shells out to `pnpm run build` and fails without pnpm
installed. That is an upstream assumption, not a fork change.
