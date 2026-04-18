import os
from dotenv import load_dotenv
load_dotenv("backend/.env")
from backend.evaluator import evaluate_transcript
print(evaluate_transcript({"results": {"channels": [{"alternatives": [{"transcript": "I am answering the interview question nicely."}]}]}}))
