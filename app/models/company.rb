class Company < ApplicationRecord
  field :legacy_id, type: Integer
  field :name, type: String

  has_many :questions, dependent: :destroy
  has_many :study_plan_companies, dependent: :destroy

  index({ name: 1 }, unique: true, sparse: true)
  index({ legacy_id: 1 }, unique: true, sparse: true)

  def study_plans
    StudyPlan.where(:id.in => study_plan_companies.pluck(:study_plan_id))
  end
end