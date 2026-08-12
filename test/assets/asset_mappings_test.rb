require "test_helper"
require "json"
require "open3"

# Proves config/asset_mappings.json still describes what the gems it covers
# actually hand to an asset pipeline.
#
# Gems declare their assets by pushing onto `config.assets.paths`, but only when
# the app looks like it has a pipeline, which ours does not. The asset_audit
# environment exists to make them declare themselves; see the comment there for
# why that is confined to a subprocess rather than switched on app-wide.
class AssetMappingsTest < ActiveSupport::TestCase
  MAPPINGS = JSON.parse(Rails.root.join("config/asset_mappings.json").read).freeze

  # The audit environment stands in for the environments the mapping declares.
  AUDITED_ENVIRONMENT = "test".freeze

  test "declared asset paths match what the gems register" do
    registered = registrations_by_gem

    mapped_gems.each do |mapping|
      assert_equal(
        mapping["assetPaths"].map { |asset_path| asset_path["path"] }.sort,
        registered.fetch(mapping["gem"], []).sort,
        "config/asset_mappings.json lists different assetPaths for #{mapping["gem"]} than " \
        "the gem registers. Reconcile the JSON with the gem, then check whether any newly " \
        "registered directory also needs a manifestEntries mapping."
      )
    end
  end

  test "no audited gem registers assets we do not know about" do
    unmapped = registrations_by_gem.keys - mapped_gems.map { |mapping| mapping["gem"] }

    assert_empty(
      unmapped,
      "#{unmapped.to_sentence} registers asset paths but is absent from " \
      "config/asset_mappings.json. Its assets will not be built."
    )
  end

  test "every mapped source glob matches at least one file" do
    mapped_gems.each do |mapping|
      root = Pathname(Gem.loaded_specs.fetch(mapping["gem"]).full_gem_path)

      mapping["manifestEntries"].each do |entry|
        assert_not_empty(
          Pathname.glob(root.join(entry["sourceGlob"])).select(&:file?),
          "#{mapping["gem"]}: sourceGlob #{entry["sourceGlob"]} matches no files. It was " \
          "probably moved or renamed in the gem."
        )
      end
    end
  end

  private

  def mapped_gems
    MAPPINGS["gems"].select do |mapping|
      mapping["railsEnvironments"].include?(AUDITED_ENVIRONMENT)
    end
  end

  # Boots the app once in the asset_audit environment and returns
  # { gem name => [path relative to the gem root, ...] }.
  def registrations_by_gem
    @registrations_by_gem ||= begin
      stdout, stderr, status = Open3.capture3(
        { "RAILS_ENV" => "asset_audit", "STATIC_DB" => "off" },
        Rails.root.join("bin/rails").to_s,
        "runner",
        "script/dump_asset_registrations.rb",
        chdir: Rails.root.to_s
      )

      assert status.success?, "asset_audit boot failed:\n#{stderr}"

      JSON.parse(stdout).group_by { |entry| entry["gem"] }.transform_values do |entries|
        entries.map { |entry| entry["path"] }
      end
    end
  end
end
