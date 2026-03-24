module Fastlane
  module Actions
    class ValidatePrerequisitesAction < Action
      def self.run(params)
        UI.message("🔍 Validating prerequisites...")
        
        errors = []
        
        # Check Android SDK
        begin
          sh("which adb > /dev/null 2>&1")
          UI.success("✅ Android SDK: Found")
        rescue
          errors << "Android SDK not found (adb not in PATH)"
          UI.error("❌ Android SDK: NOT FOUND")
        end
        
        # Check Gradle wrapper
        if File.exist?(File.join(Dir.pwd, "gradlew"))
          UI.success("✅ Gradle wrapper: Found")
        else
          errors << "Gradle wrapper not found (./gradlew missing)"
          UI.error("❌ Gradle wrapper: NOT FOUND")
        end
        
        # Check keystore
        keystore_path = File.join(Dir.pwd, "..", "my-release-key.keystore")
        if File.exist?(keystore_path)
          UI.success("✅ Keystore: Found")
        else
          errors << "Keystore not found (#{keystore_path})"
          UI.error("❌ Keystore: NOT FOUND")
        end
        
        # Check app.json
        app_json = File.join(Dir.pwd, "..", "app", "app.json")
        if File.exist?(app_json)
          UI.success("✅ app.json: Found")
        else
          errors << "app.json not found (#{app_json})"
          UI.error("❌ app.json: NOT FOUND")
        end
        
        raise errors.join("\n") unless errors.empty?
        
        UI.success("✅ All prerequisites valid!")
        return true
      end
      
      def self.description
        "Validate APK build prerequisites"
      end
      
      def self.authors
        ["Fastlane CI"]
      end
      
      def self.available_options
        []
      end
      
      def self.output
        []
      end
      
      def self.return_value
        "Returns true if all prerequisites are valid"
      end
      
      def self.is_supported?(platform)
        platform == :android
      end
    end
  end
end
