import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "dev"
    ENV: str = "dev"
    BASE_URL: str = "http://localhost:8000"


settings = Settings(_env_file=".env", _env_file_encoding="utf-8")

