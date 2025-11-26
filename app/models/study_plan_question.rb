class StudyPlanQuestion < ApplicationRecord
  field :legacy_id, type: Integer
  field :finished, type: Boolean, default: false
  field :tags, type: Hash, default: {}
  field :revisits, type: Integer, default: 0
  field :last_attempted_at, type: Time

  belongs_to :study_plan
  belongs_to :question

  index({ study_plan_id: 1 })
  index({ question_id: 1 })
  index({ legacy_id: 1 }, unique: true, sparse: true)
end