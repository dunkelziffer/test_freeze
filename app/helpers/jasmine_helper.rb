module JasmineHelper
  def render_preview_scenario(preview, scenario)
    preview_class = preview.preview_class
    render_args = preview_class.render_args(scenario.name, params: {})

    # https://github.com/lookbook-hq/lookbook/blob/main/app/views/lookbook/previews/preview.html.erb
    if render_args[:component]
      render(render_args[:component], render_args[:args], &render_args[:block])
    else
      render(@render_args[:template], **@render_args[:locals], &@render_args[:block])
    end
  end
end
