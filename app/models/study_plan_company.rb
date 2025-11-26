class StudyPlanCompany < ApplicationRecord
  field :legacy_id, type: Integer

  belongs_to :study_plan
  belongs_to :company

  index({ study_plan_id: 1, company_id: 1 }, unique: true)
  index({ legacy_id: 1 }, unique: true, sparse: true)
end
