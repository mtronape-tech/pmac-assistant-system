"""
Analytics Module for PMAC Assistant System
Provides data analysis, chart generation, and anomaly detection services.
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv
import logging

from src.config import settings
from src.database import DatabaseService
from src.services.chart_service import ChartService
from src.services.analytics_service import AnalyticsService
from src.services.anomaly_service import AnomalyService
from src.controllers.analytics_controller import AnalyticsController

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("logs/analytics.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="PMAC Analytics Service",
    description="Analytics and chart generation service for PMAC Assistant System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
database_service = DatabaseService()
chart_service = ChartService()
analytics_service = AnalyticsService(database_service)
anomaly_service = AnomalyService(database_service)
controller = AnalyticsController(
    analytics_service=analytics_service,
    chart_service=chart_service,
    anomaly_service=anomaly_service
)

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    try:
        await database_service.connect()
        logger.info("Analytics service started successfully")
    except Exception as e:
        logger.error(f"Failed to start analytics service: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    try:
        await database_service.disconnect()
        logger.info("Analytics service stopped")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        db_status = await database_service.health_check()
        return {
            "status": "ok",
            "service": "analytics",
            "timestamp": analytics_service.get_current_timestamp(),
            "database": "connected" if db_status else "disconnected",
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")

# Include analytics routes
app.include_router(
    controller.router,
    prefix="/api/analytics",
    tags=["analytics"]
)

if __name__ == "__main__":
    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)
    
    # Run the server
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )
