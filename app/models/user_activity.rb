class UserActivity < ApplicationRecord
  field :legacy_id, type: Integer
  field :action, type: String
  field :metadata, type: Hash, default: {}

  belongs_to :user

  index({ user_id: 1 })
  index({ legacy_id: 1 }, unique: true, sparse: true)
end
