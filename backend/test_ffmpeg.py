from moviepy import VideoFileClip
import os

def test_extraction():
    try:
        # Check imageio-ffmpeg
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        print(f"✅ imageio-ffmpeg found at: {ffmpeg_exe}")
        
        # Test if moviepy can use it (Mock initialization)
        # We don't even need a real file here, just check if moviepy is configured
        from moviepy.config import change_settings
        change_settings({"FFMPEG_BINARY": ffmpeg_exe})
        print("✅ moviepy reconfigured to use internal ffmpeg.")
        
    except Exception as e:
        print(f"❌ Extraction test failed: {e}")

if __name__ == "__main__":
    test_extraction()
