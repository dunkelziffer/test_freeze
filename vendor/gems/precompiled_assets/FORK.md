# Local fork

Vendored fork of our in-house [precompiled_assets](https://github.com/makandra/precompiled_assets),
consumed from the working tree via `path:` in the app's `Gemfile`.

**Forked at:** `3cf67f675f0299d3aa1e4f4bff3431c2f615d35a` (v1.0.0, 2026-04-20)

## Why

Avo 4 stopped shipping a `public/` dir and its `Rack::Static` middleware. It now
registers `app/assets` subdirectories with the host app's asset pipeline, which
this app does not have — the `avo.assets` initializer is guarded by
`app.config.respond_to?(:assets)` and silently no-ops here.

The Ruby-side questions that fall out of that, and that this fork exists to
answer, are how gem-owned assets get declared to the esbuild build and how that
declaration is verified against what the gems actually register.

See `vendor/javascript/esbuild-manifest-plugin/FORK.md` for the JS half.

## Divergences from upstream

- `compute_asset_path` falls back to the undecorated logical path, and
  `Resolver#resolve` takes several candidates. See the CHANGELOG's unreleased
  section — both are meant for upstreaming as-is.

## Working on this fork

```sh
cd vendor/gems/precompiled_assets
bundle install
bundle exec rspec
```

Upstream tests against several Rails versions via the `Gemfile.<version>` files.
