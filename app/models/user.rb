class User < ApplicationRecord
  field :legacy_id, type: Integer
  field :email,              type: String, default: ""
  field :encrypted_password, type: String, default: ""
  field :reset_password_token, type: String
  field :reset_password_sent_at, type: Time
  field :remember_created_at, type: Time

  index({ email: 1 }, unique: true)
  index({ reset_password_token: 1 }, unique: true, sparse: true)
  index({ legacy_id: 1 }, unique: true, sparse: true)

  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable
  has_many :study_plans, dependent: :destroy
  has_many :user_activities, dependent: :destroy
  has_many :user_questions, dependent: :destroy

  def solved_questions
    question_ids = user_questions.where(solved: true).pluck(:question_id)
    Question.where(:id.in => question_ids)
  end
end
