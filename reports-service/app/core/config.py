from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Dentia Reports Service"
    app_version: str = "1.0.0"

    port: int = 3006

    neo4j_uri: str = "bolt://neo4j:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "dentia_reports_password"

    jwt_secret: str = "dev_secret_change_me"
    jwt_algorithm: str = "HS256"

    internal_api_key: str = "dev_internal_reports_key"

    class Config:
        env_file = ".env"


settings = Settings()