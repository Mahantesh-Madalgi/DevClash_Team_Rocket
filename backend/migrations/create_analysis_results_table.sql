CREATE TABLE IF NOT EXISTS analysis_results (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_name text NOT NULL,
    transcript_json jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
