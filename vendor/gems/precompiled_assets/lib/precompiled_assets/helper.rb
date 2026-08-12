module PrecompiledAssets
  module Helper

    ASSET_DIRECTORIES = ActionView::Helpers::AssetUrlHelper::ASSET_PUBLIC_DIRECTORIES.except(:javascript, :stylesheet).freeze

    def asset_resolver
      Thread.current['PrecompiledAssets::Helper#asset_resolver'] ||= Resolver.new
    end

    def compute_asset_path(path, options = {})
      directory = ASSET_DIRECTORIES[options[:type]]
      path_with_directory = File.join(*directory, path)

      # We prepend a public directory the way Sprockets does. Propshaft instead
      # ignores the type and looks the logical path up as given, so a gem written
      # against it names an asset once and expects that one name to answer both
      # typed and untyped helper calls — `favicon_link_tag "avo/favicon.ico"` and
      # `asset_path("avo/favicon.ico")` for the same file. Falling back to the
      # undecorated path lets such assets be listed once, under the name the gem
      # itself uses. Only lookups that would otherwise raise are affected.
      asset_resolver.resolve(
        *[path_with_directory.delete_prefix('/'), path.to_s.delete_prefix('/')].uniq
      )
    end

  end
end
