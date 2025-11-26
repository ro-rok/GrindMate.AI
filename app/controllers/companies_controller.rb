class CompaniesController < ApplicationController
    # GET /companies
    skip_before_action :verify_authenticity_token, only: [:refresh], if: ->{ request.format.json? }
    def index
      companies = Company.order_by(name: :asc).pluck(:id, :name).map { |id, name| { id: id, name: name } }
      render json: companies
    end
  
    # GET /companies/:id
    def show
      company = Company.find(params[:id])
  
      # Trigger import if no questions exist yet
      if company.questions.empty?
        RefreshCsvJob.perform_later(company.id)
      end
  
      render json: { id: company.id, name: company.name }
    end
  
    # POST /companies/:id/refresh
    def refresh
      company = Company.find(params[:id])
      RefreshCsvJob.perform_later(company.id)
      head :accepted
    end

    def topics
      company = Company.find(params[:id])
      topic_list = company.questions.distinct(:topics).compact
      unique_topics = topic_list.flat_map { |t| t.split(',') }.map(&:strip).uniq.sort
      render json: unique_topics
    end
  end
  