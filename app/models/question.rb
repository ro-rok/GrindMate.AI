class Question < ApplicationRecord
  field :legacy_id, type: Integer
  field :title, type: String
  field :link, type: String
  field :difficulty, type: String
  field :frequency, type: Integer, default: 0
  field :acceptance_rate, type: Float, default: 0.0
  field :timeframe, type: String
  field :topics, type: String
  field :metadata, type: Hash, default: {}

  belongs_to :company
  has_many :study_plan_questions, dependent: :destroy
  has_many :user_questions, dependent: :destroy

  index({ company_id: 1 })
  index({ link: 1, company_id: 1, timeframe: 1 }, unique: true)
  index({ legacy_id: 1 }, unique: true, sparse: true)

  def study_plans
    StudyPlan.where(:id.in => study_plan_questions.pluck(:study_plan_id))
  end

  def solvers
    User.where(:id.in => user_questions.pluck(:user_id))
  end
end
