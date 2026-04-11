class ExampleComponentPreview < ViewComponent::Preview
  def standard
    render ExampleComponent.new(title: "Hello, World!")
  end
end
