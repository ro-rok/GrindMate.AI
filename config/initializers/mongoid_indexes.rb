Rails.application.config.after_initialize do
  next if defined?(Rails::Console)
  next if File.basename($PROGRAM_NAME) == "rake" && !ENV["RUN_MONGO_INDEXES_ON_BOOT"]

  begin
    Rails.logger.info("[mongoid] Ensuring indexes exist…")
    Mongoid::Tasks::Database.create_indexes
    Rails.logger.info("[mongoid] Index creation complete")
  rescue => e
    Rails.logger.error("[mongoid] Index creation failed: #{e.class} #{e.message}")
  end
end

