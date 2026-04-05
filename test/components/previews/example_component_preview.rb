class ExampleComponentPreview < Lookbook::Preview
  def standard
    render ExampleComponent.new(title: "Hello, World!")
  end
end
