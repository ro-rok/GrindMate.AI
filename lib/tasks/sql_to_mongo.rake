namespace :data do
  desc "Copy relational data into MongoDB (set SQL_MIGRATION_URL / DATABASE_URL)."
  task migrate_sql_to_mongo: :environment do
    sql_url = ENV["SQL_MIGRATION_URL"] || ENV["DATABASE_URL"]
    dry_run = ActiveModel::Type::Boolean.new.cast(ENV["DRY_RUN"])

    unless sql_url.present?
      abort "[sql_to_mongo] Missing SQL_MIGRATION_URL or DATABASE_URL"
    end

    require Rails.root.join("lib/sql_to_mongo")

    DataMigration::SqlToMongo.new(sql_url: sql_url, dry_run: dry_run).run
  end
end

