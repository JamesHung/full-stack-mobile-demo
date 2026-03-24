module Fastlane
  module Actions
    class VerifyApkSignatureAction < Action
      def self.run(params)
        apk_path = params[:apk_path]
        
        unless File.exist?(apk_path)
          UI.error("APK not found: #{apk_path}")
          raise "APK file not found"
        end
        
        UI.message("Verifying APK signature...")
        
        # Run apksigner verify
        cmd = "apksigner verify -v '#{apk_path}'"
        
        begin
          output = `#{cmd} 2>&1`
          status = $?.exitstatus
          
          if status == 0
            UI.success("✅ APK signature verified")
            return true
          else
            UI.error("Signature verification failed")
            UI.error(output)
            raise "Signature verification failed"
          end
        rescue => e
          UI.error("Error verifying signature: #{e}")
          raise "Cannot verify APK signature (apksigner not found or other error)"
        end
      end
      
      def self.description
        "Verify APK signature using apksigner"
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
          )
        ]
      end
      
      def self.output
        []
      end
      
      def self.return_value
        "True if signature is valid"
      end
      
      def self.is_supported?(platform)
        platform == :android
      end
    end
  end
end
