require "view_component/test_helpers"

class JasmineController < ApplicationController
  helper :all
  helper ::ViewComponent::TestHelpers

  def index
  end
end
