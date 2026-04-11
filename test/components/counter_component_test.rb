require "test_helper"
require "view_component/test_helpers"

class CounterComponentTest < ActiveSupport::TestCase
  include ViewComponent::TestHelpers

  def test_renders_counter_structure
    render_inline(CounterComponent.new(initial_value: 5))

    html = rendered_content

    assert_match %r{<div[^>]*class="counter"[^>]*>}, html
    assert_match %r{<button[^>]*data-element="counter:decrement"[^>]*>−</button>}, html
    assert_match %r{<span[^>]*data-element="counter:value"[^>]*>5</span>}, html
    assert_match %r{<button[^>]*data-element="counter:increment"[^>]*>\+</button>}, html
  end

  def test_defaults_to_zero
    render_inline(CounterComponent.new)

    assert_match %r{<span[^>]*data-element="counter:value"[^>]*>0</span>}, rendered_content
  end
end
