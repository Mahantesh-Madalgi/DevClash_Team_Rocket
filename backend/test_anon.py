from supabase import create_client

SUPABASE_URL = "https://yptzwnbgbimbwczsnaxj.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwdHp3bmJnYmltYndjenNuYXhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDEzOTQsImV4cCI6MjA5MjA3NzM5NH0.MWo9zUvGVUOTkxwO8jCoJoVhLmZggHnqyqXjKv5k_no"

supabase = create_client(SUPABASE_URL, ANON_KEY)
resp = supabase.table("analysis_results").select("video_name").execute()
print("ROWS FETCHED WITH ANON KEY:", resp.data)
