"""
Chart generation service for Analytics Module
Handles creation of various chart types using Matplotlib and Plotly
"""

import io
import base64
import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
import pandas as pd
import numpy as np

# Matplotlib imports
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import seaborn as sns

# Plotly imports
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import plotly.io as pio

from ..config import settings

logger = logging.getLogger(__name__)

class ChartService:
    """Service for generating various types of charts"""
    
    def __init__(self):
        # Configure matplotlib style
        plt.style.use('seaborn-v0_8')
        sns.set_palette("husl")
        
        # Configure plotly
        pio.kaleido.scope.mathjax = None
        
        self.default_colors = [
            '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
            '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
        ]
    
    def create_time_series_chart(
        self,
        data: pd.DataFrame,
        title: str = "Time Series Chart",
        x_column: str = "timestamp",
        y_columns: List[str] = None,
        chart_type: str = "matplotlib",
        width: int = None,
        height: int = None
    ) -> Dict[str, Any]:
        """Create time series chart"""
        try:
            if data.empty:
                raise ValueError("No data provided for chart")
            
            width = width or settings.default_chart_width
            height = height or settings.default_chart_height
            
            if y_columns is None:
                y_columns = [col for col in data.columns if col != x_column]
            
            if chart_type == "matplotlib":
                return self._create_matplotlib_time_series(
                    data, title, x_column, y_columns, width, height
                )
            elif chart_type == "plotly":
                return self._create_plotly_time_series(
                    data, title, x_column, y_columns, width, height
                )
            else:
                raise ValueError(f"Unsupported chart type: {chart_type}")
                
        except Exception as e:
            logger.error(f"Error creating time series chart: {e}")
            raise
    
    def _create_matplotlib_time_series(
        self,
        data: pd.DataFrame,
        title: str,
        x_column: str,
        y_columns: List[str],
        width: int,
        height: int
    ) -> Dict[str, Any]:
        """Create time series chart using matplotlib"""
        fig, ax = plt.subplots(figsize=(width/100, height/100))
        
        # Plot each y column
        for i, col in enumerate(y_columns):
            if col in data.columns:
                color = self.default_colors[i % len(self.default_colors)]
                ax.plot(data[x_column], data[col], label=col, color=color, linewidth=2)
        
        # Format the chart
        ax.set_title(title, fontsize=14, fontweight='bold')
        ax.set_xlabel('Time', fontsize=12)
        ax.set_ylabel('Value', fontsize=12)
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        # Format x-axis for time
        if pd.api.types.is_datetime64_any_dtype(data[x_column]):
            ax.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M:%S'))
            ax.xaxis.set_major_locator(mdates.MinuteLocator(interval=5))
            plt.xticks(rotation=45)
        
        plt.tight_layout()
        
        # Convert to base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        return {
            "type": "matplotlib",
            "format": "png",
            "data": image_base64,
            "width": width,
            "height": height
        }
    
    def _create_plotly_time_series(
        self,
        data: pd.DataFrame,
        title: str,
        x_column: str,
        y_columns: List[str],
        width: int,
        height: int
    ) -> Dict[str, Any]:
        """Create time series chart using plotly"""
        fig = go.Figure()
        
        # Add traces for each y column
        for i, col in enumerate(y_columns):
            if col in data.columns:
                color = self.default_colors[i % len(self.default_colors)]
                fig.add_trace(go.Scatter(
                    x=data[x_column],
                    y=data[col],
                    mode='lines',
                    name=col,
                    line=dict(color=color, width=2)
                ))
        
        # Update layout
        fig.update_layout(
            title=title,
            xaxis_title="Time",
            yaxis_title="Value",
            width=width,
            height=height,
            showlegend=True,
            hovermode='x unified'
        )
        
        # Convert to JSON
        chart_json = fig.to_json()
        
        return {
            "type": "plotly",
            "format": "json",
            "data": chart_json,
            "width": width,
            "height": height
        }
    
    def create_histogram(
        self,
        data: pd.DataFrame,
        column: str,
        title: str = "Histogram",
        bins: int = 30,
        chart_type: str = "matplotlib",
        width: int = None,
        height: int = None
    ) -> Dict[str, Any]:
        """Create histogram chart"""
        try:
            if data.empty or column not in data.columns:
                raise ValueError(f"Column {column} not found in data")
            
            width = width or settings.default_chart_width
            height = height or settings.default_chart_height
            
            if chart_type == "matplotlib":
                return self._create_matplotlib_histogram(
                    data, column, title, bins, width, height
                )
            elif chart_type == "plotly":
                return self._create_plotly_histogram(
                    data, column, title, bins, width, height
                )
            else:
                raise ValueError(f"Unsupported chart type: {chart_type}")
                
        except Exception as e:
            logger.error(f"Error creating histogram: {e}")
            raise
    
    def _create_matplotlib_histogram(
        self,
        data: pd.DataFrame,
        column: str,
        title: str,
        bins: int,
        width: int,
        height: int
    ) -> Dict[str, Any]:
        """Create histogram using matplotlib"""
        fig, ax = plt.subplots(figsize=(width/100, height/100))
        
        # Create histogram
        ax.hist(data[column].dropna(), bins=bins, alpha=0.7, color=self.default_colors[0], edgecolor='black')
        
        # Format the chart
        ax.set_title(title, fontsize=14, fontweight='bold')
        ax.set_xlabel(column, fontsize=12)
        ax.set_ylabel('Frequency', fontsize=12)
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        # Convert to base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        return {
            "type": "matplotlib",
            "format": "png",
            "data": image_base64,
            "width": width,
            "height": height
        }
    
    def _create_plotly_histogram(
        self,
        data: pd.DataFrame,
        column: str,
        title: str,
        bins: int,
        width: int,
        height: int
    ) -> Dict[str, Any]:
        """Create histogram using plotly"""
        fig = px.histogram(
            data,
            x=column,
            nbins=bins,
            title=title,
            labels={column: column, 'count': 'Frequency'}
        )
        
        fig.update_layout(
            width=width,
            height=height,
            showlegend=False
        )
        
        # Convert to JSON
        chart_json = fig.to_json()
        
        return {
            "type": "plotly",
            "format": "json",
            "data": chart_json,
            "width": width,
            "height": height
        }
    
    def create_scatter_plot(
        self,
        data: pd.DataFrame,
        x_column: str,
        y_column: str,
        title: str = "Scatter Plot",
        color_column: str = None,
        chart_type: str = "matplotlib",
        width: int = None,
        height: int = None
    ) -> Dict[str, Any]:
        """Create scatter plot"""
        try:
            if data.empty:
                raise ValueError("No data provided for chart")
            
            if x_column not in data.columns or y_column not in data.columns:
                raise ValueError(f"Columns {x_column} or {y_column} not found in data")
            
            width = width or settings.default_chart_width
            height = height or settings.default_chart_height
            
            if chart_type == "matplotlib":
                return self._create_matplotlib_scatter(
                    data, x_column, y_column, title, color_column, width, height
                )
            elif chart_type == "plotly":
                return self._create_plotly_scatter(
                    data, x_column, y_column, title, color_column, width, height
                )
            else:
                raise ValueError(f"Unsupported chart type: {chart_type}")
                
        except Exception as e:
            logger.error(f"Error creating scatter plot: {e}")
            raise
    
    def _create_matplotlib_scatter(
        self,
        data: pd.DataFrame,
        x_column: str,
        y_column: str,
        title: str,
        color_column: str,
        width: int,
        height: int
    ) -> Dict[str, Any]:
        """Create scatter plot using matplotlib"""
        fig, ax = plt.subplots(figsize=(width/100, height/100))
        
        # Create scatter plot
        if color_column and color_column in data.columns:
            scatter = ax.scatter(data[x_column], data[y_column], c=data[color_column], 
                               cmap='viridis', alpha=0.6)
            plt.colorbar(scatter, ax=ax, label=color_column)
        else:
            ax.scatter(data[x_column], data[y_column], alpha=0.6, color=self.default_colors[0])
        
        # Format the chart
        ax.set_title(title, fontsize=14, fontweight='bold')
        ax.set_xlabel(x_column, fontsize=12)
        ax.set_ylabel(y_column, fontsize=12)
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        # Convert to base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        return {
            "type": "matplotlib",
            "format": "png",
            "data": image_base64,
            "width": width,
            "height": height
        }
    
    def _create_plotly_scatter(
        self,
        data: pd.DataFrame,
        x_column: str,
        y_column: str,
        title: str,
        color_column: str,
        width: int,
        height: int
    ) -> Dict[str, Any]:
        """Create scatter plot using plotly"""
        fig = px.scatter(
            data,
            x=x_column,
            y=y_column,
            color=color_column if color_column and color_column in data.columns else None,
            title=title
        )
        
        fig.update_layout(
            width=width,
            height=height
        )
        
        # Convert to JSON
        chart_json = fig.to_json()
        
        return {
            "type": "plotly",
            "format": "json",
            "data": chart_json,
            "width": width,
            "height": height
        }
    
    def create_box_plot(
        self,
        data: pd.DataFrame,
        column: str,
        group_by: str = None,
        title: str = "Box Plot",
        chart_type: str = "matplotlib",
        width: int = None,
        height: int = None
    ) -> Dict[str, Any]:
        """Create box plot"""
        try:
            if data.empty or column not in data.columns:
                raise ValueError(f"Column {column} not found in data")
            
            width = width or settings.default_chart_width
            height = height or settings.default_chart_height
            
            if chart_type == "matplotlib":
                return self._create_matplotlib_box_plot(
                    data, column, group_by, title, width, height
                )
            elif chart_type == "plotly":
                return self._create_plotly_box_plot(
                    data, column, group_by, title, width, height
                )
            else:
                raise ValueError(f"Unsupported chart type: {chart_type}")
                
        except Exception as e:
            logger.error(f"Error creating box plot: {e}")
            raise
    
    def _create_matplotlib_box_plot(
        self,
        data: pd.DataFrame,
        column: str,
        group_by: str,
        title: str,
        width: int,
        height: int
    ) -> Dict[str, Any]:
        """Create box plot using matplotlib"""
        fig, ax = plt.subplots(figsize=(width/100, height/100))
        
        # Create box plot
        if group_by and group_by in data.columns:
            data.boxplot(column=column, by=group_by, ax=ax)
            ax.set_title(title)
            plt.suptitle('')  # Remove automatic title
        else:
            ax.boxplot(data[column].dropna())
            ax.set_title(title, fontsize=14, fontweight='bold')
            ax.set_ylabel(column, fontsize=12)
        
        ax.grid(True, alpha=0.3)
        plt.tight_layout()
        
        # Convert to base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        return {
            "type": "matplotlib",
            "format": "png",
            "data": image_base64,
            "width": width,
            "height": height
        }
    
    def _create_plotly_box_plot(
        self,
        data: pd.DataFrame,
        column: str,
        group_by: str,
        title: str,
        width: int,
        height: int
    ) -> Dict[str, Any]:
        """Create box plot using plotly"""
        fig = px.box(
            data,
            y=column,
            x=group_by if group_by and group_by in data.columns else None,
            title=title
        )
        
        fig.update_layout(
            width=width,
            height=height
        )
        
        # Convert to JSON
        chart_json = fig.to_json()
        
        return {
            "type": "plotly",
            "format": "json",
            "data": chart_json,
            "width": width,
            "height": height
        }
    
    def export_chart_as_image(
        self,
        chart_data: Dict[str, Any],
        format: str = "png"
    ) -> bytes:
        """Export chart as image bytes"""
        try:
            if chart_data["type"] == "matplotlib":
                # Chart is already in base64 PNG format
                if format.lower() == "png":
                    return base64.b64decode(chart_data["data"])
                else:
                    raise ValueError(f"Format {format} not supported for matplotlib charts")
            
            elif chart_data["type"] == "plotly":
                # Convert plotly chart to image
                import json
                fig_dict = json.loads(chart_data["data"])
                fig = go.Figure(fig_dict)
                
                if format.lower() in ["png", "jpg", "jpeg", "svg", "pdf"]:
                    img_bytes = fig.to_image(format=format.lower())
                    return img_bytes
                else:
                    raise ValueError(f"Format {format} not supported")
            
            else:
                raise ValueError(f"Unknown chart type: {chart_data['type']}")
                
        except Exception as e:
            logger.error(f"Error exporting chart as image: {e}")
            raise
