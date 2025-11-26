require "active_record"

module DataMigration
  class SqlToMongo
    class LegacyBase < ActiveRecord::Base
      self.abstract_class = true
    end

    class LegacyCompany < LegacyBase
      self.table_name = "companies"
    end

    class LegacyQuestion < LegacyBase
      self.table_name = "questions"
    end

    class LegacyStudyPlan < LegacyBase
      self.table_name = "study_plans"
    end

    class LegacyStudyPlanCompany < LegacyBase
      self.table_name = "study_plan_companies"
    end

    class LegacyStudyPlanQuestion < LegacyBase
      self.table_name = "study_plan_questions"
    end

    class LegacyUserActivity < LegacyBase
      self.table_name = "user_activities"
    end

    class LegacyUserQuestion < LegacyBase
      self.table_name = "user_questions"
    end

    class LegacyUser < LegacyBase
      self.table_name = "users"
    end

    def initialize(sql_url:, dry_run: false)
      raise ArgumentError, "Provide SQL_MIGRATION_URL or DATABASE_URL" if sql_url.blank?

      @sql_url = sql_url
      @dry_run = dry_run
      @id_map = Hash.new { |hash, key| hash[key] = {} }
    end

    def run
      establish_connection
      migrate_companies
      migrate_questions
      migrate_users
      migrate_study_plans
      migrate_user_questions
      migrate_user_activities
      migrate_study_plan_companies
      migrate_study_plan_questions
      puts "[sql_to_mongo] Migration complete"
    ensure
      LegacyBase.connection_pool.disconnect! if LegacyBase.connected?
    end

    private

    def establish_connection
      LegacyBase.establish_connection(@sql_url)
    end

    def migrate_companies
      LegacyCompany.find_each do |legacy|
        company = Company.find_or_initialize_by(legacy_id: legacy.id)
        company.name = legacy.name
        apply_timestamps(company, legacy)
        persist(company, :companies, legacy.id)
      end
    end

    def migrate_questions
      LegacyQuestion.find_each do |legacy|
        company_id = mapped_id(:companies, legacy.company_id)
        next unless company_id

        question = Question.find_or_initialize_by(legacy_id: legacy.id)
        question.company_id = company_id
        question.title = legacy.title
        question.link = legacy.link
        question.difficulty = legacy.difficulty
        question.frequency = legacy.frequency
        question.acceptance_rate = legacy.acceptance_rate
        question.timeframe = legacy.timeframe
        question.topics = legacy.topics
        apply_timestamps(question, legacy)
        persist(question, :questions, legacy.id)
      end
    end

    def migrate_users
      LegacyUser.find_each do |legacy|
        user = User.find_or_initialize_by(legacy_id: legacy.id)
        user.email = legacy.email
        user.encrypted_password = legacy.encrypted_password
        user.reset_password_token = legacy.reset_password_token
        user.reset_password_sent_at = legacy.reset_password_sent_at
        user.remember_created_at = legacy.remember_created_at
        apply_timestamps(user, legacy)
        persist(user, :users, legacy.id)
      end
    end

    def migrate_study_plans
      LegacyStudyPlan.find_each do |legacy|
        user_id = mapped_id(:users, legacy.user_id)
        next unless user_id

        study_plan = StudyPlan.find_or_initialize_by(legacy_id: legacy.id)
        study_plan.user_id = user_id
        study_plan.name = legacy.name
        study_plan.timeframe = legacy.timeframe
        apply_timestamps(study_plan, legacy)
        persist(study_plan, :study_plans, legacy.id)
      end
    end

    def migrate_user_questions
      LegacyUserQuestion.find_each do |legacy|
        user_id = mapped_id(:users, legacy.user_id)
        question_id = mapped_id(:questions, legacy.question_id)
        next unless user_id && question_id

        user_question = UserQuestion.find_or_initialize_by(legacy_id: legacy.id)
        user_question.user_id = user_id
        user_question.question_id = question_id
        user_question.solved = legacy.solved
        user_question.solved_at = legacy.solved_at
        apply_timestamps(user_question, legacy)
        persist(user_question, :user_questions, legacy.id)
      end
    end

    def migrate_user_activities
      LegacyUserActivity.find_each do |legacy|
        user_id = mapped_id(:users, legacy.user_id)
        next unless user_id

        activity = UserActivity.find_or_initialize_by(legacy_id: legacy.id)
        activity.user_id = user_id
        activity.action = legacy.action
        activity.metadata = legacy.metadata
        apply_timestamps(activity, legacy)
        persist(activity, :user_activities, legacy.id)
      end
    end

    def migrate_study_plan_companies
      LegacyStudyPlanCompany.find_each do |legacy|
        study_plan_id = mapped_id(:study_plans, legacy.study_plan_id)
        company_id = mapped_id(:companies, legacy.company_id)
        next unless study_plan_id && company_id

        spc = StudyPlanCompany.find_or_initialize_by(legacy_id: legacy.id)
        spc.study_plan_id = study_plan_id
        spc.company_id = company_id
        apply_timestamps(spc, legacy)
        persist(spc, :study_plan_companies, legacy.id)
      end
    end

    def migrate_study_plan_questions
      LegacyStudyPlanQuestion.find_each do |legacy|
        study_plan_id = mapped_id(:study_plans, legacy.study_plan_id)
        question_id = mapped_id(:questions, legacy.question_id)
        next unless study_plan_id && question_id

        spq = StudyPlanQuestion.find_or_initialize_by(legacy_id: legacy.id)
        spq.study_plan_id = study_plan_id
        spq.question_id = question_id
        spq.finished = legacy.finished
        spq.tags = legacy.tags.presence || {}
        spq.revisits = legacy.revisits
        spq.last_attempted_at = legacy.last_attempted_at
        apply_timestamps(spq, legacy)
        persist(spq, :study_plan_questions, legacy.id)
      end
    end

    def persist(document, bucket, legacy_id)
      if @dry_run
        puts "[sql_to_mongo] (dry-run) #{document.class.name} legacy=#{legacy_id} would be saved"
      else
        document.save!
      end

      @id_map[bucket][legacy_id] = document.id
    end

    def mapped_id(bucket, legacy_id)
      return if legacy_id.nil?

      @id_map[bucket][legacy_id] ||= begin
        model = bucket_model(bucket)
        record = model&.find_by(legacy_id: legacy_id)
        record&.id
      end
    end

    def bucket_model(bucket)
      {
        companies: Company,
        questions: Question,
        users: User,
        study_plans: StudyPlan,
        user_questions: UserQuestion,
        user_activities: UserActivity,
        study_plan_companies: StudyPlanCompany,
        study_plan_questions: StudyPlanQuestion
      }[bucket]
    end

    def apply_timestamps(document, legacy)
      document.created_at = legacy.created_at if legacy.respond_to?(:created_at)
      document.updated_at = legacy.updated_at if legacy.respond_to?(:updated_at)
    end
  end
end

