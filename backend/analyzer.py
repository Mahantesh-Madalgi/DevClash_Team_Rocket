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

def analyze_energy_timeline(audio_path: str) -> list:
    """
    Extracts sliding window features (Loudness and Pitch Proxy) to generate a confidence gradient.
    """
    import numpy as np
    try:
        y, sr = librosa.load(audio_path, sr=None)
        
        # Feature 1: Loudness (Root Mean Square Energy)
        rms = librosa.feature.rms(y=y)[0]
        
        # Feature 2: Pitch/Brightness Proxy (Spectral Centroid computes faster than raw F0 on long files)
        centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        
        # Normalize full signal space to 0-1 bounds before averaging
        rms_norm = rms / np.max(rms) if np.max(rms) > 0 else rms
        centroid_norm = centroid / np.max(centroid) if np.max(centroid) > 0 else centroid
        
        # Target fixed 30 data points exactly
        target_points = 30
        frames_per_bin = max(1, len(rms) // target_points)
        
        raw_scores = []
        for i in range(target_points):
            start = i * frames_per_bin
            end = start + frames_per_bin
            if start >= len(rms):
                break
            
            # Weighted aggregations
            avg_rms = np.mean(rms_norm[start:end])
            avg_pitch = np.mean(centroid_norm[start:end])
            raw_scores.append((0.6 * avg_rms) + (0.4 * avg_pitch))
            
        # Smoothing: Simple Moving Average (window=3)
        smoothed = []
        for i in range(len(raw_scores)):
            start_window = max(0, i - 1)
            end_window = min(len(raw_scores), i + 2)
            smoothed.append(np.mean(raw_scores[start_window:end_window]))
            
        # Min-Max Normalization so minimum is strictly 0.0 and maximum is 1.0 stringently
        min_val = np.min(smoothed) if smoothed else 0
        max_val = np.max(smoothed) if smoothed else 1
        val_range = max_val - min_val
        
        timeline = []
        total_duration = len(y) / sr
        time_step = total_duration / target_points
        
        for i, s in enumerate(smoothed):
            if val_range > 0:
                normalized_s = (s - min_val) / val_range
            else:
                normalized_s = 0.5
                
            timeline.append({
                "time": round(float((i + 1) * time_step), 1),
                "score": round(float(normalized_s), 3)
            })
            
        return timeline
    except Exception as e:
        print(f"DEBUG: Error building energy timeline: {e}")
        return []

def extract_confidence_events(energy_timeline: list) -> list:
    """
    Scans the normalized timeline. Scores > 0.8 denote a high-confidence peak.
    Returns a list of structured positive events.
    """
    events = []
    for point in energy_timeline:
        if point.get("score", 0) > 0.8:
            events.append({
                "timestamp": point["time"],
                "type": "positive",
                "category": "vocal_projection",
                "description": "Strong acoustic projection and vocal clarity.",
                "correction": None
            })
            
    # Filter overlapping consecutive event triggers to ensure UI readability
    filtered = []
    last_time = -10.0
    for e in events:
        if e["timestamp"] - last_time >= 6.0: # 6 seconds spacing (increased from 4s)
            filtered.append(e)
            last_time = e["timestamp"]
            
    return filtered

def calculate_success_probability(confidence, tech_depth, events: list, energy_timeline: list) -> int:
    """
    Calculates a comprehensive selection probability score (0-100).
    Now with resilient type casting to prevent 500 errors from LLM string outputs.
    """
    try:
        # Helper to safely convert AI output to float
        def safe_float(val, default=5.0):
            try:
                if isinstance(val, (int, float)): return float(val)
                if isinstance(val, str):
                    # Handle "8/10" or other common LLM string patterns
                    clean = val.split('/')[0].strip()
                    return float(clean)
                return default
            except:
                return default

        f_conf = safe_float(confidence, 5.0)
        f_tech = safe_float(tech_depth, 5.0)

        # 1. Base AI Score (Scaled to 70 points max)
        base_score = (f_tech * 4.0) + (f_conf * 3.0)
        
        # 2. Event Impact (20 points max swing)
        pos_count = len([e for e in events if e.get("type") == "positive"])
        neg_count = len([e for e in events if e.get("type") == "negative"])
        
        event_delta = (pos_count * 6.0) - (neg_count * 5.5)
        
        # 3. Energy Factor (10 points max)
        energy_bonus = 0
        if energy_timeline:
            avg_energy = sum([p.get("score", 0) for p in energy_timeline]) / len(energy_timeline)
            # High energy (>0.45) adds bonus, Very low energy (<0.15) penalizes
            if avg_energy > 0.45:
                energy_bonus = 5
            elif avg_energy < 0.15:
                energy_bonus = -10
            
            # Volatility check 
            scores = [p.get("score", 0) for p in energy_timeline]
            if len(scores) > 1:
                volatility = max(scores) - min(scores)
                if volatility > 0.8: # Extreme volatility (erratic)
                    energy_bonus -= 5
        
        final_prob = base_score + event_delta + energy_bonus
        
        # Clamp between 2% and 98% (never 0 or 100 for a more "human" AI feel)
        return int(min(98, max(2, final_prob)))
        
    except Exception as e:
        print(f"DEBUG: Error calculating success probability: {e}")
        return 5 # Safe fallback
