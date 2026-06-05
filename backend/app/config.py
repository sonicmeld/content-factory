from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_ENV: str = "development"
    DATABASE_PATH: str = "../database/content_factory.db"
    DATA_PATH: str = "../data"
    NINE_ROUTER_URL: str = ""
    NINE_ROUTER_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
