if defined?(Avo)
  # Allow moving Avo controllers into `app/avo/controllers/`
  Rails.autoloaders.main.collapse(
    Rails.root.join("app/avo/controllers")
  )
else
  # Don't load Avo
  Rails.autoloaders.main.ignore(
    Rails.root.join("app/avo"),
    Rails.root.join("app/controllers/avo")
  )

  # Don't configure Avo
  return
end

# == Static assets ==
# Avo 3 shipped its assets in the gem's `public/` dir and mounted a Rack::Static
# over them. Avo 4 dropped both and registers `app/assets` with the host app's
# asset pipeline instead — but that initializer is a no-op here, since it is
# guarded by `app.config.respond_to?(:assets)` and we run esbuild rather than
# Sprockets or Propshaft. So serve the images out of the gem ourselves.
#
# Note that Rack::Static's Array form never strips the matched prefix; it passes
# PATH_INFO to Rack::Files untouched. The URL prefix therefore has to mirror the
# gem's own directory layout.
avo_assets_prefix = "/images/avo"
avo_gem_assets_root = Pathname(Gem.loaded_specs.fetch("avo").full_gem_path).join("app/assets")

Rails.application.config.middleware.use(
  Rack::Static,
  urls: [avo_assets_prefix],
  root: avo_gem_assets_root
)

# Avo's stylesheet references its webfonts relatively and esbuild leaves those
# URLs alone (see external: ['fonts/*'] in esbuild.config.js), so the browser
# resolves them against the built CSS and asks for /assets/avo/fonts/. Map each
# one onto the gem with Rack::Static's Hash form, which does rewrite PATH_INFO.
avo_font_urls = avo_gem_assets_root.join("images/avo/fonts").children.to_h do |font|
  ["/assets/avo/fonts/#{font.basename}", "#{avo_assets_prefix}/fonts/#{font.basename}"]
end

Rails.application.config.middleware.use(
  Rack::Static,
  urls: avo_font_urls,
  root: avo_gem_assets_root
)

# For more information regarding these settings check out our docs https://docs.avohq.io
# The values disaplayed here are the default ones. Uncomment and change them to fit your needs.
Avo.configure do |config|
  ## == Routing ==
  config.root_path = "/avo"
  # used only when you have custom `map` configuration in your config.ru
  # config.prefix_path = "/internal"

  # Where should the user be redirected when visiting the `/avo` url
  # config.home_path = nil

  ## == Licensing ==
  # config.license_key = ENV['AVO_LICENSE_KEY']

  ## == Set the context ==
  config.set_context do
    # Return a context object that gets evaluated within Avo::ApplicationController
  end

  ## == Authentication ==
  # config.current_user_method = :current_user
  # config.authenticate_with do
  # end

  ## == Authorization ==
  # config.is_admin_method = :is_admin
  # config.is_developer_method = :is_developer
  # config.authorization_methods = {
  #   index: 'index?',
  #   show: 'show?',
  #   edit: 'edit?',
  #   new: 'new?',
  #   update: 'update?',
  #   create: 'create?',
  #   destroy: 'destroy?',
  #   search: 'search?',
  # }
  # config.raise_error_on_missing_policy = false
  config.authorization_client = nil
  # config.explicit_authorization = true

  ## == Localization ==
  # config.locale = 'en-US'

  ## == Resource options ==
  # config.resource_row_controls_config = {
  #   placement: :right,
  #   float: false,
  #   show_on_hover: false
  # }.freeze
  # config.model_resource_mapping = {}
  # config.default_view_type = :table
  # config.per_page = 24
  # config.per_page_steps = [12, 24, 48, 72]
  # config.via_per_page = 8
  # config.id_links_to_resource = false
  # config.pagination = -> do
  #   {
  #     type: :default,
  #     size: 9, # `[1, 2, 2, 1]` for pagy < 9.0
  #   }
  # end

  ## == Response messages dismiss time ==
  # config.alert_dismiss_time = 5000


  ## == Number of search results to display ==
  # config.search_results_count = 8

  ## == Cache options ==
  ## Provide a lambda to customize the cache store used by Avo.
  ## We compute the cache store by default, this is NOT the default, just an example.
  # config.cache_store = -> {
  #   ActiveSupport::Cache.lookup_store(:solid_cache_store)
  # }
  # config.cache_resources_on_index_view = true

  ## == Turbo options ==
  # config.turbo = -> do
  #   {
  #     instant_click: true
  #   }
  # end

  ## == Logger ==
  # config.logger = -> {
  #   file_logger = ActiveSupport::Logger.new(Rails.root.join("log", "avo.log"))
  #
  #   file_logger.datetime_format = "%Y-%m-%d %H:%M:%S"
  #   file_logger.formatter = proc do |severity, time, progname, msg|
  #     "[Avo] #{time}: #{msg}\n".tap do |i|
  #       puts i
  #     end
  #   end
  #
  #   file_logger
  # }

  ## == Keyboard shortcuts ==
  # config.hotkeys = {
  #   enabled: true,          # Master switch: set to false to disable all keyboard shortcuts
  #   show_key_badges: true   # Set to false to hide inline kbd badge elements from the UI
  # }

  ## == Sidebar ==
  # config.sidebar = {
  #   # Show the navbar button that collapses the sidebar on desktop. On mobile
  #   # the toggle is always visible regardless of this setting.
  #   toggle_visible: true,
  #
  #   # Set to false to remove the drag-to-resize handle entirely. Drag-only
  #   # resizing is a known WCAG SC 2.5.7 gap, so hosts with an AA/VPAT
  #   # obligation can opt out.
  #   resizable: true,
  #
  #   # Width the sidebar starts at on desktop, in pixels, before a user drags it.
  #   # Clamped to 200..480. Only applies at >= lg — below that the sidebar is a
  #   # full-height overlay and stays 256px so it cannot cover a phone screen.
  #   default_width: 256
  # }

  ## == Back to top button ==
  # config.back_to_top = {
  #   enabled: true,   # Off by default; set to true to show the "Back to top" pill
  #   threshold: 64    # Pixels scrolled down before an upward scroll reveals it
  # }

  ## == Associations ==
  # config.associations = {
  #   # Cap how many records a belongs_to/attach lookup lists before showing the
  #   # "more records available" notice.
  #   lookup_list_limit: 1000,
  #   # Cold-start loading for association turbo frames (has_one, has_many, habtm),
  #   # used when a field doesn't set its own `loading:`.
  #   frames: {
  #     loading: :lazy,             # :lazy (load on reveal) or :manual (placeholder + Load button)
  #     auto_load_for: 15.minutes   # how long a manual frame is remembered once opened (0/nil to disable)
  #   }
  # }

  ## == Customization ==
  config.click_row_to_view_record = true
  # config.density = :normal # :tight, :normal, :relaxed
  # config.app_name = 'Avocadelicious'
  # config.timezone = 'UTC'
  # config.use_browser_timezone = true # set false to render dates/times in the app's configured zone for everyone
  # config.currency = 'USD'
  # config.hide_layout_when_printing = false
  # config.container_width = :large # :full, :large, or :small. Hash for per-view: { index: :full, single: :small }
  # config.use_stacked_fields = false
  # Set to false to disable Avo's Tailwind integration even when `tailwindcss-ruby` is installed.
  # config.tailwindcss_integration_enabled = true
  # config.search_debounce = 300
  # config.view_component_path = "app/components"
  # config.display_license_request_timeout_error = true
  # config.buttons_on_form_footers = true
  # config.field_wrapper_layout = true
  # config.resource_parent_controller = "Avo::ResourcesController"
  # config.first_sorting_option = :desc # :desc or :asc
  # config.exclude_from_status = ["license_key"]
  # config.model_generator_hook = true

  ## == Appearance ==
  # Avo's defaults are logical asset names ("avo/logo.png") resolved through the
  # asset pipeline. We don't have one — `precompiled_assets` overrides
  # `compute_asset_path` and raises UnknownAsset for anything missing from the
  # esbuild manifest, and these images never enter that manifest. Rails skips
  # `compute_asset_path` entirely for sources starting with "/", so absolute
  # paths bypass the resolver; avo_assets_prefix below serves them.
  config.appearance = {
    logo: "#{avo_assets_prefix}/logo.png",
    logo_dark: "#{avo_assets_prefix}/logo-dark.png",
    logomark: "#{avo_assets_prefix}/logomark.png",
    logomark_dark: "#{avo_assets_prefix}/logomark-dark.png",
    favicon: "#{avo_assets_prefix}/favicon.ico",
    favicon_dark: "#{avo_assets_prefix}/favicon-dark.ico",
    placeholder: "#{avo_assets_prefix}/placeholder.svg",
  }

  # config.appearance = {
  #   logo: "avo/logo.png",
  #   logo_dark: "avo/logo-dark.png",
  #   logomark: "avo/logomark.png",
  #   logomark_dark: "avo/logomark-dark.png",
  #   favicon: "avo/favicon.ico",
  #   favicon_dark: "avo/favicon-dark.ico",
  #   lock: [:scheme, :neutral, :accent]
  #   neutrals: [:brand, :neutral, :slate, :olive],
  #   accents: [:brand, :red, :blue, :sky, :purple],
  #   mode: :static,
  #   neutral: :brand,
  #   accent: :brand,
  #   scheme: :auto,
  #   persistence: :database,
  #   placeholder: "avo/placeholder.svg",
  #   chart_colors: ["#0B8AE2", "#34C683", "#2AB1EE", "#34C6A8"],
  #   load_settings: -> { current_user&.avo_preferences&.dig("appearance")&.symbolize_keys || {} },
  # }

  ## == Breadcrumbs ==
  # config.set_initial_breadcrumbs do
  #   add_breadcrumb title: "Home", path: '/avo'
  # end

  ## == Menus ==
  # config.main_menu = -> {
  #   section "Dashboards", icon: "tabler/outline/layout-dashboard" do
  #     all_dashboards
  #   end

  #   section "Resources", icon: "tabler/outline/chart-bar-popular" do
  #     all_resources
  #   end

  #   section "Tools", icon: "tabler/outline/tool" do
  #     all_tools
  #   end
  # }
  # config.profile_menu = -> {
  #   link "Profile", path: "/avo/profile", icon: "tabler/outline/user-circle"
  # }
end
