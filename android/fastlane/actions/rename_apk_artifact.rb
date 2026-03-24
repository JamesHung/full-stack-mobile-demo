module Fastlane
  module Actions
    class RenameApkArtifactAction < Action
      def self.run(params)
        require 'time'
        
        apk_path = params[:apk_path]
        version = params[:version]
        build_number = params[:build_number]
        timestamp = params[:timestamp] || Time.now.utc.strftime('%Y%m%dT%H%M%SZ')
        
        # Validate inputs
        unless File.exist?(apk_path)
          UI.error("APK not found: #{apk_path}")
          raise "APK file not found"
        end
        
        # Generate new filename
        filename = "app-v#{version}-build#{build_number}-#{timestamp}.apk"
        apk_dir = File.dirname(apk_path)
        new_apk_path = File.join(apk_dir, filename)
        
        # Move file
        begin
          File.rename(apk_path, new_apk_path)
        rescue => e
          UI.error("Failed to rename APK: #{e}")
          raise "Cannot rename APK"
        end
        
        UI.success("✅ APK renamed to: #{filename}")
        return new_apk_path
      end
      
      def self.description
        "Rename APK with version-stamped filename"
      end
      
      def self.authors
        ["Fastlane CI"]
      end
      
      def self.available_options
        [
          FastlaneCore::ConfigItem.new(
            key: :apk_path,
            description: "Path to APK file",
            type: String,
            verify_block: proc do |value|
              UI.user_error!("APK path not provided") unless value
            end
          ),
          FastlaneCore::ConfigItem.new(
            key: :version,
            description: "App version (e.g., 1.0.0)",
            type: String,
            verify_block: proc do |value|
              UI.user_error!("Version not provided") unless value
            end
          ),
          FastlaneCore::ConfigItem.new(
            key: :build_number,
            description: "Build number (e.g., 42)",
            type: Integer,
            verify_block: proc do |value|
              UI.user_error!("Build number not provided") unless value
            end
          ),
          FastlaneCore::ConfigItem.new(
            key: :timestamp,
            description: "ISO 8601 UTC timestamp (optional)",
            type: String,
            optional: true
          )
        ]
      end
      
      def self.output
        [
          ['APK_PATH', 'New APK file path']
        ]
      end
      
      def self.return_value
        "New APK file path"
      end
      
      def self.is_supported?(platform)
        platform == :android
      end
    end
  end
end
