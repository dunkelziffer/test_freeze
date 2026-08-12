# Prints, as JSON, the asset paths every engine registered during boot.
#
# Only meaningful under RAILS_ENV=asset_audit, which is what makes those
# registrations run at all. Invoked as a subprocess by
# test/assets/asset_mappings_test.rb.

registrations = Rails.application.config.assets.paths.map do |path|
  gem_name, spec = Gem.loaded_specs.find { |_, s| path.to_s.start_with?(s.full_gem_path + "/") }

  if spec
    { "gem" => gem_name, "path" => path.to_s.delete_prefix(spec.full_gem_path + "/") }
  else
    { "gem" => nil, "path" => path.to_s }
  end
end

puts JSON.generate(registrations)
