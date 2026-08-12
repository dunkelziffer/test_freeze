module PrecompiledAssets
  class Resolver

    class Error < PrecompiledAssets::Error; end
    class UnknownAsset < Error; end

    # Resolves the first of the given paths that the manifest knows about.
    # Callers pass more than one when the same asset may be listed under
    # several logical names; see PrecompiledAssets::Helper#compute_asset_path.
    def resolve(*paths)
      reload_manifest if Rails.env.development? && manifest.expired?

      paths.each do |path|
        digested_path = manifest.resolve(path.to_s)

        return File.join(Rails.configuration.asset_path, digested_path) if digested_path.present?
      end

      raise UnknownAsset, "Could not find #{paths.map(&:inspect).join(' or ')} in manifest: #{manifest.inspect}"
    end

    def manifest
      @manifest ||= Manifest.new
    end

    def reload_manifest
      @manifest = nil
      manifest
    end

  end
end
