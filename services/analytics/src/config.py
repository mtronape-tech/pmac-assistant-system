"""
Configuration settings for Analytics Module
"""

import os
from pydantic import Field
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """Application settings"""
    
    # Server settings
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=3003, env="PORT")
    debug: bool = Field(default=True, env="DEBUG")
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # Database settings (SQLite)
    db_path: str = Field(default="analytics.db", env="DB_PATH")
    
    # Analytics settings
    max_data_points: int = Field(default=10000, env="MAX_DATA_POINTS")
    chart_cache_ttl: int = Field(default=300, env="CHART_CACHE_TTL")  # 5 minutes
    default_chart_width: int = Field(default=800, env="CHART_WIDTH")
    default_chart_height: int = Field(default=600, env="CHART_HEIGHT")
    
    # Anomaly detection settings
    anomaly_threshold: float = Field(default=2.5, env="ANOMALY_THRESHOLD")
    anomaly_window_size: int = Field(default=100, env="ANOMALY_WINDOW_SIZE")
    
    # Export settings
    export_dir: str = Field(default="exports", env="EXPORT_DIR")
    max_export_size: int = Field(default=50000, env="MAX_EXPORT_SIZE")
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Global settings instance
settings = Settings()

# Ensure export directory exists
os.makedirs(settings.export_dir, exist_ok=True)
