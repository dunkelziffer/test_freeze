class CounterComponent < ViewComponent::Base
  def initialize(initial_value: 0)
    @initial_value = initial_value
  end
end
