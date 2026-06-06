import os
from pydantic_settings import BaseSettings, SettingsConfigDict

def get_or_create_encryption_key() -> str:
    from cryptography.fernet import Fernet
    env_file = ".env"
    if os.path.exists(env_file):
        with open(env_file, "r") as f:
            for line in f:
                if line.startswith("ENCRYPTION_KEY="):
                    return line.strip().split("=", 1)[1]
    
    new_key = Fernet.generate_key().decode()
    with open(env_file, "a") as f:
        f.write(f"\nENCRYPTION_KEY={new_key}\n")
    return new_key

class Settings(BaseSettings):
    APP_ENV: str = "development"
    DATABASE_PATH: str = "../database/content_factory.db"
    DATA_PATH: str = "../data"
    NINE_ROUTER_URL: str = ""
    NINE_ROUTER_API_KEY: str = ""
    NINE_ROUTER_MODEL: str = ""
    OAUTH_REDIRECT_URI: str = "https://oauth.sonicmeld.web.id/api/oauth/callback"
    FRONTEND_URL: str = ""
    ENCRYPTION_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
if not settings.ENCRYPTION_KEY:
    settings.ENCRYPTION_KEY = get_or_create_encryption_key()
