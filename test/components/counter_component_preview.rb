class CounterComponentPreview < ViewComponent::Preview
  # A counter with custom initial value
  # ---
  # You probably don't want to use this component for real,
  # because it doesn't persist the counter value anywhere.
  #
  # @label Custom
  # @param initial_value [Integer]
  def custom(initial_value: 42)
    render CounterComponent.new(initial_value: initial_value)
  end

  # @!group Initial Values

  # @label Default
  def zero
    render CounterComponent.new
  end

  def forty_two
    render CounterComponent.new(initial_value: 42)
  end

  def negative_one
    render CounterComponent.new(initial_value: -1)
  end

  # @!endgroup
end
