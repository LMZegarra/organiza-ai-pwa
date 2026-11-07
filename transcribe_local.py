import sys
import json
import os
from faster_whisper import WhisperModel

def transcribe(audio_path):
    # Usar modelo 'base' en CPU con int8: ultraliviano, rápido y en español
    model_size = "base"
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    
    segments, info = model.transcribe(audio_path, language="es", beam_size=5)
    
    text_parts = []
    for segment in segments:
        text_parts.append(segment.text)
        
    full_text = " ".join(text_parts).strip()
    return full_text

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No audio file provided"}))
        sys.exit(1)
        
    audio_file = sys.argv[1]
    try:
        result_text = transcribe(audio_file)
        print(json.dumps({"transcription": result_text}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
