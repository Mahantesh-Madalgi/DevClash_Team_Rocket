import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

def check_columns():
    try:
        # Check analysis_results
        print("Checking analysis_results...")
        res = supabase.table("analysis_results").select("*").limit(1).execute()
        columns = res.data[0].keys() if res.data else []
        print(f"Results columns: {list(columns)}")
        if 'exchanges_json' not in columns:
            print("MISSING: exchanges_json in analysis_results")
            
        # Check analysis_events
        print("\nChecking analysis_events...")
        res = supabase.table("analysis_events").select("*").limit(1).execute()
        columns = res.data[0].keys() if res.data else []
        print(f"Events columns: {list(columns)}")
        missing = [c for c in ['diagnosis', 'gold_standard', 'growth_plan'] if c not in columns]
        if missing:
            print(f"MISSING: {missing} in analysis_events")
            
    except Exception as e:
        print(f"Error checking schema: {e}")

if __name__ == "__main__":
    check_columns()
