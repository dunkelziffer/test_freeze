class ComponentGenerator < Rails::Generators::NamedBase
  source_root File.expand_path("../../templates/view_component/frozen_extensions", __dir__)

  # Run `bin/rails generate view_component:component` with the same arguments and options
  hook_for :component, in: :view_component, default: true, type: :boolean

  # Generate additional files
  def add_css_file
    template "bem.css.tt", File.join("app/components", class_path, "#{file_name}_component.css")
  end

  def add_unpoly_compiler
    template "unpoly_compiler.js.tt", File.join("app/components", class_path, "#{file_name}_component.js")
  end

  def add_jasmine_spec
    template "jasmine_spec.js.tt", File.join("test/components", class_path, "#{file_name}_component_spec.js")
  end
end
