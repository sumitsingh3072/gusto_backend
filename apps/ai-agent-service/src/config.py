from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-20250514"
    claude_max_tokens: int = 2048
    claude_temperature: float = 0.2
    max_menu_items_per_batch: int = 50
    swiggy_cart_cap: float = 1000.0
    log_level: str = "INFO"

    model_config = {"env_prefix": "", "case_sensitive": False}

settings = Settings()
