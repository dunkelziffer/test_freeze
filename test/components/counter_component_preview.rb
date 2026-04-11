class CounterComponentPreview < ViewComponent::Preview
  def zero
    render CounterComponent.new
  end

  def forty_two
    render CounterComponent.new(initial_value: 42)
  end

  def negative_one
    render CounterComponent.new(initial_value: -1)
  end
end
