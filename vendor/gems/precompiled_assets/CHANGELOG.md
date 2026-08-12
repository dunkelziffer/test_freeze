## [Unreleased]

- `compute_asset_path` now falls back to the undecorated logical path when the
  directory-prefixed one is not in the manifest. We prepend a public directory
  the way Sprockets does; Propshaft ignores the asset type and resolves a logical
  path as given, so gems written against it list an asset once under the name
  they pass to both typed and untyped helpers (`favicon_link_tag "avo/favicon.ico"`
  and `asset_path("avo/favicon.ico")` for the same file). The prefixed path is
  still preferred when both are listed, so only lookups that previously raised
  are affected.
- `Resolver#resolve` accepts several candidate paths and returns the first one
  the manifest knows about.

## [1.0.0] - 2026-04-20

- Add tests to this gem
- Add CI test matrix for various Rails and Ruby versions
- Add CI job rubocop linting

## [0.3.0] - 2025-09-22

- Support for ViewComponent 4. (ViewComponent 3 support was implicit due to its `ActionView::Base` dependency.)

## [0.2.1] - 2022-08-29

- Fix reloading expired manifest file.
- Fix typos in readme document.

## [0.2.0] - 2022-08-04

- `Manifest#updated_at` now exposes manifest's modification time.
- Updated readme document.

## [0.1.0] - 2022-07-27

- First public release.
