import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")

    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    EXPO_TOKEN: str = os.getenv("EXPO_TOKEN", "")
    PEXELS_API_KEY: str = os.getenv("PEXELS_API_KEY", "")

    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Default credits given to a new user
    DEFAULT_CREDITS: int = 20


settings = Settings()
