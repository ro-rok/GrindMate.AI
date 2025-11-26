class UserQuestion < ApplicationRecord
  field :legacy_id, type: Integer
  field :solved, type: Mongoid::Boolean, default: true
  field :solved_at, type: Time

  belongs_to :user
  belongs_to :question

  index({ user_id: 1 })
  index({ question_id: 1 })
  index({ user_id: 1, question_id: 1 }, unique: true)
  index({ legacy_id: 1 }, unique: true, sparse: true)

  before_save do
    self.solved_at = Time.current if will_save_change_to_solved? && solved
  end
end
