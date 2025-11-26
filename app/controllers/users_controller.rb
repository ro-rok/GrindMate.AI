class UsersController < ApplicationController
  skip_before_action :verify_authenticity_token, only: [:reset_progress]
  skip_before_action :authenticate_user!, raise: false
  before_action :set_optional_user

  # POST /users/reset_progress.json
  def reset_progress
    unless @current_user
      render json: { error: "Missing or invalid user_id" }, status: :unauthorized and return
    end

    if params[:company_id].present?
      question_ids = Question.where(company_id: params[:company_id]).pluck(:id)
      @current_user.user_questions.where(:question_id.in => question_ids).destroy_all
    else
      @current_user.user_questions.destroy_all
    end

    head :no_content
  end

  private

  def set_optional_user
    @current_user = User.find_by(id: params[:user_id])
  end
end
