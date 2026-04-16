class User < ApplicationRecord
  include FriendlyId
  friendly_id :name
end
