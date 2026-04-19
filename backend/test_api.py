import requests
import json

url = "http://127.0.0.1:8000/upload"
video_path = "dummy_test.mp4"

def test_upload():
    try:
        with open(video_path, "rb") as f:
            files = {"file": ("dummy_test.mp4", f, "video/mp4")}
            data = {"job_description": "We need a great software engineer."}
            print("Sending request...")
            response = requests.post(url, files=files, data=data)
            print(f"Status Code: {response.status_code}")
            try:
                print(json.dumps(response.json(), indent=2))
            except:
                print(response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_upload()
