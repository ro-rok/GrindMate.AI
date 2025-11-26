require_relative "boot"

require "rails"

require "active_model/railtie"
require "active_job/railtie"
require "action_controller/railtie"
require "action_mailer/railtie"
require "action_view/railtie"
require "action_cable/engine"
require "rails/test_unit/railtie"

require "mongoid"
require "mongoid/railtie"

if ['development', 'test'].include?(ENV['RAILS_ENV'] || ENV['RACK_ENV'])
  require 'dotenv-rails'
  Dotenv::Rails.load
end

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module LeetcodeTracker
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.middleware.use ActionDispatch::Flash
    config.load_defaults 8.0
    config.middleware.use ActionDispatch::Cookies
    config.middleware.use ActionDispatch::Session::CookieStore
    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks])

    config.middleware.use Warden::Manager do |manager|
      Devise.warden_config = manager
    end

    config.before_configuration do
      Mongoid.load!(config.root.join("config/mongoid.yml"), Rails.env)
    end

    config.generators do |g|
      g.orm :mongoid
    end
    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")

    # Only loads a smaller set of middleware suitable for API only apps.
    # Middleware like session, flash, cookies can be added back manually.
    # Skip views, helpers and assets when generating a new resource.
    config.api_only = true
  end
end
