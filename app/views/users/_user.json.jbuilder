json.extract! user, :id, :slug, :name, :age, :created_at, :updated_at
json.url user_url(user, format: :json)
