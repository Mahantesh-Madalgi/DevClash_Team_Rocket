from supabase import create_client

SUPABASE_URL = "https://yptzwnbgbimbwczsnaxj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwdHp3bmJnYmltYndjenNuYXhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUwMTM5NCwiZXhwIjoyMDkyMDc3Mzk0fQ.AlwiyRK_HTmizHATCkWpt4fteHXAHnr6nydywhPA1CI"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
resp = supabase.table("analysis_results").select("video_name, created_at").execute()
print("ROWS IN DATABASE:", resp.data)
