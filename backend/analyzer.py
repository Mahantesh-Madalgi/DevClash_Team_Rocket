import librosa
import string

def count_silent_gaps(audio_path: str, top_db: int = 35, min_duration: float = 2.0) -> int:
    """
    Analyzes an audio file and counts the number of silent gaps that exceed a minimum duration.
    """
    try:
        y, sr = librosa.load(audio_path, sr=None)
        # librosa.effects.split returns non-silent intervals (frames where decibels > top_db relative to peak)
        non_silent = librosa.effects.split(y, top_db=top_db)
        
        gaps = 0
        last_end = 0
        
        for start, end in non_silent:
            gap_duration = (start - last_end) / sr
            if last_end > 0 and gap_duration > min_duration:
                gaps += 1
            last_end = end
            
        return gaps
    except Exception as e:
        print(f"DEBUG: Error analyzing audio gaps: {e}")
        return 0

def count_filler_words(deepgram_json: dict) -> int:
    """
    Parses Deepgram JSON results to count common filler words for the primary speaker.
    """
    try:
        fillers = {"um", "uh", "ah", "like", "you know", "hmm", "mhm"}
        count = 0
        
        channels = deepgram_json.get("results", {}).get("channels", [])
        if not channels:
            return 0
            
        words = channels[0].get("alternatives", [{}])[0].get("words", [])
        
        for w_info in words:
            word = w_info.get("word", "").lower().strip()
            word = word.translate(str.maketrans("", "", string.punctuation))
            
            # Deepgram sometimes explicitly returns `filler_word: true` when `filler_words=true` is requested
            if w_info.get("filler_word", False):
                count += 1
            elif word in fillers:
                count += 1
                
        return count
    except Exception as e:
        print(f"DEBUG: Error counting filler words: {e}")
        return 0
