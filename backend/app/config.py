from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    APP_ENV: Literal["development", "staging", "production"] = "development"
    APP_NAME: str = "HVAC Field Service"
    APP_VERSION: str = "0.1.0"

    # Database
    DATABASE_URL: str = "postgresql://hvac_user:hvac_pass@localhost:5432/hvac_dev"

    # JWT
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # Microsoft Entra ID (Azure AD)
    AZURE_TENANT_ID: str = ""
    AZURE_CLIENT_ID: str = ""
    AZURE_CLIENT_SECRET: str = ""
    AZURE_REDIRECT_URI: str = "http://localhost:8000/auth/microsoft/callback"

    # Salesforce (leave empty — activated later)
    SF_INSTANCE_URL: str = ""
    SF_CLIENT_ID: str = ""
    SF_CLIENT_SECRET: str = ""
    SF_USERNAME: str = ""
    SF_PASSWORD: str = ""
    SF_SECURITY_TOKEN: str = ""

    # Redis (token blacklist + rate limiting)
    REDIS_URL: str = "redis://localhost:6379/0"

    PORT: int = 8000

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
