require "test_helper"
require "view_component/test_helpers"

class CounterComponentTest < ActiveSupport::TestCase
  include ViewComponent::TestHelpers

  def test_renders_counter_structure
    render_inline(CounterComponent.new(initial_value: 5))

    assert_selector ".counter"
    assert_selector "button[data-element='counter:decrement']", text: "−"
    assert_selector "span[data-element='counter:value']", text: "5"
    assert_selector "button[data-element='counter:increment']", text: "+"

    data = JSON.parse(page.find(".counter")["up-data"])
    assert_equal 5, data["initialValue"]
  end

  def test_defaults_to_zero
    render_inline(CounterComponent.new)

    assert_selector "span[data-element='counter:value']", text: "0"
  end
end
