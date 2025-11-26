class StudyPlan < ApplicationRecord
  field :legacy_id, type: Integer
  field :name, type: String
  field :timeframe, type: String

  belongs_to :user
  has_many :study_plan_companies, dependent: :destroy
  has_many :study_plan_questions, dependent: :destroy

  index({ user_id: 1 })
  index({ legacy_id: 1 }, unique: true, sparse: true)

  def companies
    Company.where(:id.in => study_plan_companies.pluck(:company_id))
  end

  def questions
    Question.where(:id.in => study_plan_questions.pluck(:question_id))
  end
end
