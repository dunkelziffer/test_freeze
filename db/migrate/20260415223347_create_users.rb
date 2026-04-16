class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users, id: :string, default: -> { "uuid()" }, limit: 36 do |t|
      t.string :slug
      t.string :name
      t.integer :age

      t.timestamps
    end
  end
end
