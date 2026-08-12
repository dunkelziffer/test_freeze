# Environment used only by test/assets/asset_mappings_test.rb.
#
# Gems that ship assets register them by pushing onto `config.assets.paths`, but
# only when the host app looks like it has a pipeline — Avo's registration is
# guarded by `app.config.respond_to?(:assets)`. We have no pipeline, so that
# registration never runs and there is nothing to check config/asset_mappings.json
# against.
#
# Defining `config.assets` here makes those initializers run and declare
# themselves. It is deliberately confined to this environment: claiming a pipeline
# app-wide breaks gems that go on to assume a Sprockets or Propshaft API. avo-icons,
# for one, then reaches for `Rails.application.assets_manifest` and raises.
require_relative "test"

Rails.application.configure do
  config.assets = ActiveSupport::OrderedOptions.new

  # `paths` is what the audit reads. The rest is the surface gems mutate on the
  # way past without checking — turbo-rails does `config.assets.precompile +=`,
  # which fails on the nil an OrderedOptions would otherwise hand back. Add to
  # this as new gems need it; a NoMethodError on boot here is the signal.
  config.assets.paths = []
  config.assets.precompile = []
  config.assets.excluded_paths = []
end
