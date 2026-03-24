module Fastlane
  module Actions
    class ReadAppConfigAction < Action
      def self.run(params)
        require 'json'
        
        app_json_path = File.join(Dir.pwd, "..", "app", "app.json")
        
        unless File.exist?(app_json_path)
          UI.error("app.json not found at #{app_json_path}")
          raise "app.json not found"
        end
        
        begin
          config = JSON.parse(File.read(app_json_path))
        rescue JSON::ParserError => e
          UI.error("Failed to parse app.json: #{e}")
          raise "Invalid JSON in app.json"
        end
        
        # Extract version and build number from Expo config
        version = config.dig("expo", "version")
        build_number = config.dig("expo", "android", "versionCode")
        package = config.dig("expo", "android", "package")
        
        unless version
          UI.error("Version not found in app.json (expo.version)")
          raise "Version missing from app.json"
        end
        
        unless build_number
          UI.error("Build number not found in app.json (expo.android.versionCode)")
          raise "Build number missing from app.json"
        end
        
        # Validate version format (semver)
        unless version.match?(/^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/)
          UI.error("Invalid version format: #{version} (expected X.Y.Z)")
          raise "Invalid version format"
        end
        
        # Validate build number is positive integer
        unless build_number.is_a?(Integer) && build_number > 0
          UI.error("Invalid versionCode: #{build_number} (must be > 0)")
          raise "Invalid versionCode"
        end
        
        UI.success("✅ Read version #{version} (build #{build_number})")
        
        # Return config hash
        return {
          version: version,
          build_number: build_number,
          package: package
        }
      end
      
      def self.description
        "Read app version and build number from app.json"
      end
      
      def self.authors
        ["Fastlane CI"]
      end
      
      def self.available_options
        []
      end
      
      def self.output
        [
          ['APP_VERSION', 'App version from app.json'],
          ['APP_BUILD_NUMBER', 'Build number from app.json']
        ]
      end
      
      def self.return_value
        "Hash with version, build_number, and package"
      end
      
      def self.is_supported?(platform)
        platform == :android
      end
    end
  end
end
