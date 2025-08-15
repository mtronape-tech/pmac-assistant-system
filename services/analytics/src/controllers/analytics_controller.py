"""
Analytics Controller for PMAC Assistant System
Provides REST API endpoints for data analytics, chart generation, and anomaly detection
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import io
import json

from ..services.analytics_service import AnalyticsService
from ..services.chart_service import ChartService
from ..services.anomaly_service import AnomalyService

logger = logging.getLogger(__name__)

# Request/Response models
class StatisticsRequest(BaseModel):
    machine_id: str
    variable_type: str
    variable_address: int
    start_time: datetime
    end_time: datetime

class TrendAnalysisRequest(BaseModel):
    machine_id: str
    variable_type: str
    variable_address: int
    start_time: datetime
    end_time: datetime
    window_size: Optional[int] = 50

class CorrelationRequest(BaseModel):
    machine_id: str
    start_time: datetime
    end_time: datetime
    variable_types: Optional[List[str]] = None

class PCARequest(BaseModel):
    machine_id: str
    start_time: datetime
    end_time: datetime
    variable_types: Optional[List[str]] = None
    n_components: Optional[int] = None

class OperationalModesRequest(BaseModel):
    machine_id: str
    start_time: datetime
    end_time: datetime
    n_clusters: Optional[int] = None

class ChartRequest(BaseModel):
    machine_id: str
    start_time: datetime
    end_time: datetime
    chart_type: str = Field(default="time_series", description="Type of chart: time_series, histogram, scatter, box")
    variables: List[Dict[str, Any]] = Field(description="Variables to plot: [{'type': 'P', 'address': 1}, ...]")
    chart_engine: str = Field(default="plotly", description="Chart engine: matplotlib or plotly")
    title: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None

class AnomalyDetectionRequest(BaseModel):
    machine_id: str
    variable_type: str
    variable_address: int
    start_time: datetime
    end_time: datetime
    method: str = Field(default="zscore", description="Detection method: zscore, iqr, modified_zscore, isolation_forest")
    threshold: Optional[float] = None

class MultivariateAnomalyRequest(BaseModel):
    machine_id: str
    start_time: datetime
    end_time: datetime
    variable_types: Optional[List[str]] = None
    method: str = Field(default="isolation_forest", description="Detection method: isolation_forest, local_outlier_factor, dbscan")

class TimeSeriesAnomalyRequest(BaseModel):
    machine_id: str
    variable_type: str
    variable_address: int
    start_time: datetime
    end_time: datetime
    window_size: Optional[int] = None

class AnalyticsController:
    """Controller for analytics endpoints"""
    
    def __init__(self, analytics_service: AnalyticsService, chart_service: ChartService, anomaly_service: AnomalyService):
        self.analytics_service = analytics_service
        self.chart_service = chart_service
        self.anomaly_service = anomaly_service
        self.router = APIRouter()
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup API routes"""
        
        # Analytics endpoints
        self.router.add_api_route("/statistics", self.get_statistics, methods=["POST"])
        self.router.add_api_route("/trends", self.analyze_trends, methods=["POST"])
        self.router.add_api_route("/correlations", self.calculate_correlations, methods=["POST"])
        self.router.add_api_route("/pca", self.perform_pca, methods=["POST"])
        self.router.add_api_route("/operational-modes", self.detect_operational_modes, methods=["POST"])
        
        # Chart endpoints
        self.router.add_api_route("/charts/generate", self.generate_chart, methods=["POST"])
        self.router.add_api_route("/charts/export/{format}", self.export_chart, methods=["POST"])
        
        # Anomaly detection endpoints
        self.router.add_api_route("/anomalies/statistical", self.detect_statistical_anomalies, methods=["POST"])
        self.router.add_api_route("/anomalies/multivariate", self.detect_multivariate_anomalies, methods=["POST"])
        self.router.add_api_route("/anomalies/time-series", self.detect_time_series_anomalies, methods=["POST"])
        self.router.add_api_route("/anomalies/summary", self.get_anomaly_summary, methods=["GET"])
        
        # Data endpoints
        self.router.add_api_route("/machines", self.get_machines, methods=["GET"])
        self.router.add_api_route("/machines/{machine_id}/variables", self.get_machine_variables, methods=["GET"])
        self.router.add_api_route("/data/latest", self.get_latest_data, methods=["GET"])
    
    async def get_statistics(self, request: StatisticsRequest) -> Dict[str, Any]:
        """Get basic statistics for a variable"""
        try:
            result = await self.analytics_service.get_basic_statistics(
                machine_id=request.machine_id,
                variable_type=request.variable_type,
                variable_address=request.variable_address,
                start_time=request.start_time,
                end_time=request.end_time
            )
            return {"success": True, "data": result}
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def analyze_trends(self, request: TrendAnalysisRequest) -> Dict[str, Any]:
        """Analyze trends in time series data"""
        try:
            result = await self.analytics_service.detect_trends(
                machine_id=request.machine_id,
                variable_type=request.variable_type,
                variable_address=request.variable_address,
                start_time=request.start_time,
                end_time=request.end_time,
                window_size=request.window_size
            )
            return {"success": True, "data": result}
        except Exception as e:
            logger.error(f"Error analyzing trends: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def calculate_correlations(self, request: CorrelationRequest) -> Dict[str, Any]:
        """Calculate correlations between variables"""
        try:
            result = await self.analytics_service.calculate_correlations(
                machine_id=request.machine_id,
                start_time=request.start_time,
                end_time=request.end_time,
                variable_types=request.variable_types
            )
            return {"success": True, "data": result}
        except Exception as e:
            logger.error(f"Error calculating correlations: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def perform_pca(self, request: PCARequest) -> Dict[str, Any]:
        """Perform Principal Component Analysis"""
        try:
            result = await self.analytics_service.perform_pca_analysis(
                machine_id=request.machine_id,
                start_time=request.start_time,
                end_time=request.end_time,
                variable_types=request.variable_types,
                n_components=request.n_components
            )
            return {"success": True, "data": result}
        except Exception as e:
            logger.error(f"Error performing PCA: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def detect_operational_modes(self, request: OperationalModesRequest) -> Dict[str, Any]:
        """Detect operational modes using clustering"""
        try:
            result = await self.analytics_service.detect_operational_modes(
                machine_id=request.machine_id,
                start_time=request.start_time,
                end_time=request.end_time,
                n_clusters=request.n_clusters
            )
            return {"success": True, "data": result}
        except Exception as e:
            logger.error(f"Error detecting operational modes: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def generate_chart(self, request: ChartRequest) -> Dict[str, Any]:
        """Generate charts from PMAC data"""
        try:
            # Get data from database
            variable_types = [var["type"] for var in request.variables]
            variable_addresses = [var["address"] for var in request.variables]
            
            data = await self.analytics_service.db.get_pmac_data(
                machine_id=request.machine_id,
                start_time=request.start_time,
                end_time=request.end_time,
                variable_types=variable_types,
                variable_addresses=variable_addresses
            )
            
            if data.empty:
                raise HTTPException(status_code=404, detail="No data found for the specified parameters")
            
            # Generate chart based on type
            if request.chart_type == "time_series":
                # Pivot data for time series
                chart_data = data.pivot_table(
                    index='timestamp',
                    columns=['variable_type', 'variable_address'],
                    values='value',
                    aggfunc='mean'
                )
                
                # Create column names for legend
                y_columns = [f"{col[0]}{col[1]}" for col in chart_data.columns]
                chart_data.columns = y_columns
                chart_data.reset_index(inplace=True)
                
                result = self.chart_service.create_time_series_chart(
                    data=chart_data,
                    title=request.title or f"Time Series - {request.machine_id}",
                    x_column="timestamp",
                    y_columns=y_columns,
                    chart_type=request.chart_engine,
                    width=request.width,
                    height=request.height
                )
            
            elif request.chart_type == "histogram":
                if len(request.variables) != 1:
                    raise HTTPException(status_code=400, detail="Histogram requires exactly one variable")
                
                result = self.chart_service.create_histogram(
                    data=data,
                    column="value",
                    title=request.title or f"Histogram - {request.variables[0]['type']}{request.variables[0]['address']}",
                    chart_type=request.chart_engine,
                    width=request.width,
                    height=request.height
                )
            
            elif request.chart_type == "scatter":
                if len(request.variables) != 2:
                    raise HTTPException(status_code=400, detail="Scatter plot requires exactly two variables")
                
                # Pivot data for scatter plot
                chart_data = data.pivot_table(
                    index='timestamp',
                    columns=['variable_type', 'variable_address'],
                    values='value',
                    aggfunc='mean'
                )
                
                if chart_data.shape[1] < 2:
                    raise HTTPException(status_code=400, detail="Insufficient data for scatter plot")
                
                col1 = f"{chart_data.columns[0][0]}{chart_data.columns[0][1]}"
                col2 = f"{chart_data.columns[1][0]}{chart_data.columns[1][1]}"
                chart_data.columns = [col1, col2]
                
                result = self.chart_service.create_scatter_plot(
                    data=chart_data,
                    x_column=col1,
                    y_column=col2,
                    title=request.title or f"Scatter Plot - {col1} vs {col2}",
                    chart_type=request.chart_engine,
                    width=request.width,
                    height=request.height
                )
            
            elif request.chart_type == "box":
                if len(request.variables) != 1:
                    raise HTTPException(status_code=400, detail="Box plot requires exactly one variable")
                
                result = self.chart_service.create_box_plot(
                    data=data,
                    column="value",
                    title=request.title or f"Box Plot - {request.variables[0]['type']}{request.variables[0]['address']}",
                    chart_type=request.chart_engine,
                    width=request.width,
                    height=request.height
                )
            
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported chart type: {request.chart_type}")
            
            return {"success": True, "chart": result}
        
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error generating chart: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def export_chart(self, format: str, chart_data: Dict[str, Any]) -> StreamingResponse:
        """Export chart as image"""
        try:
            if format.lower() not in ["png", "jpg", "jpeg", "svg", "pdf"]:
                raise HTTPException(status_code=400, detail=f"Unsupported export format: {format}")
            
            # Export chart
            image_bytes = self.chart_service.export_chart_as_image(chart_data, format)
            
            # Determine content type
            content_types = {
                "png": "image/png",
                "jpg": "image/jpeg",
                "jpeg": "image/jpeg",
                "svg": "image/svg+xml",
                "pdf": "application/pdf"
            }
            
            content_type = content_types.get(format.lower(), "application/octet-stream")
            
            # Create streaming response
            return StreamingResponse(
                io.BytesIO(image_bytes),
                media_type=content_type,
                headers={"Content-Disposition": f"attachment; filename=chart.{format}"}
            )
        
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error exporting chart: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def detect_statistical_anomalies(self, request: AnomalyDetectionRequest) -> Dict[str, Any]:
        """Detect statistical anomalies"""
        try:
            result = await self.anomaly_service.detect_statistical_anomalies(
                machine_id=request.machine_id,
                variable_type=request.variable_type,
                variable_address=request.variable_address,
                start_time=request.start_time,
                end_time=request.end_time,
                method=request.method,
                threshold=request.threshold
            )
            return {"success": True, "data": result}
        except Exception as e:
            logger.error(f"Error detecting statistical anomalies: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def detect_multivariate_anomalies(self, request: MultivariateAnomalyRequest) -> Dict[str, Any]:
        """Detect multivariate anomalies"""
        try:
            result = await self.anomaly_service.detect_multivariate_anomalies(
                machine_id=request.machine_id,
                start_time=request.start_time,
                end_time=request.end_time,
                variable_types=request.variable_types,
                method=request.method
            )
            return {"success": True, "data": result}
        except Exception as e:
            logger.error(f"Error detecting multivariate anomalies: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def detect_time_series_anomalies(self, request: TimeSeriesAnomalyRequest) -> Dict[str, Any]:
        """Detect time series anomalies"""
        try:
            result = await self.anomaly_service.detect_time_series_anomalies(
                machine_id=request.machine_id,
                variable_type=request.variable_type,
                variable_address=request.variable_address,
                start_time=request.start_time,
                end_time=request.end_time,
                window_size=request.window_size
            )
            return {"success": True, "data": result}
        except Exception as e:
            logger.error(f"Error detecting time series anomalies: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_anomaly_summary(
        self,
        machine_id: str = Query(..., description="Machine ID"),
        start_time: datetime = Query(..., description="Start time"),
        end_time: datetime = Query(..., description="End time")
    ) -> Dict[str, Any]:
        """Get anomaly summary for a machine"""
        try:
            result = await self.anomaly_service.get_anomaly_summary(
                machine_id=machine_id,
                start_time=start_time,
                end_time=end_time
            )
            return {"success": True, "data": result}
        except Exception as e:
            logger.error(f"Error getting anomaly summary: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_machines(self) -> Dict[str, Any]:
        """Get list of available machines"""
        try:
            machines = await self.analytics_service.db.get_machine_list()
            return {"success": True, "machines": machines}
        except Exception as e:
            logger.error(f"Error getting machine list: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_machine_variables(self, machine_id: str) -> Dict[str, Any]:
        """Get variables for a specific machine"""
        try:
            variables = await self.analytics_service.db.get_variable_types(machine_id)
            return {"success": True, "variables": variables}
        except Exception as e:
            logger.error(f"Error getting machine variables: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_latest_data(
        self,
        machine_id: str = Query(..., description="Machine ID"),
        variable_types: Optional[List[str]] = Query(None, description="Variable types to filter"),
        limit: int = Query(100, description="Maximum number of records")
    ) -> Dict[str, Any]:
        """Get latest data for a machine"""
        try:
            data = await self.analytics_service.db.get_latest_data(
                machine_id=machine_id,
                variable_types=variable_types,
                limit=limit
            )
            
            # Convert DataFrame to dict for JSON serialization
            if not data.empty:
                result = data.to_dict('records')
                # Convert timestamps to ISO format
                for record in result:
                    if 'timestamp' in record:
                        record['timestamp'] = record['timestamp'].isoformat()
            else:
                result = []
            
            return {"success": True, "data": result, "count": len(result)}
        except Exception as e:
            logger.error(f"Error getting latest data: {e}")
            raise HTTPException(status_code=500, detail=str(e))
