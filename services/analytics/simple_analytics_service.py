#!/usr/bin/env python3
"""
Simple Analytics Service with SQLite database
For testing and development purposes
"""

import os
import sys
import asyncio
import sqlite3
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import plotly.graph_objects as go
import plotly.express as px
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Create necessary directories
os.makedirs("logs", exist_ok=True)
os.makedirs("exports", exist_ok=True)

# Initialize FastAPI app
app = FastAPI(
    title="PMAC Analytics Service (Simple)",
    description="Simple analytics service with SQLite database",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SimpleDatabase:
    """Simple SQLite database for testing"""
    
    def __init__(self, db_path: str = "analytics_test.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize SQLite database with sample data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create pmac_data table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pmac_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                machine_id TEXT NOT NULL,
                variable_type TEXT,
                variable_address INTEGER,
                value REAL,
                quality TEXT,
                collection_job_id TEXT
            )
        """)
        
        # Create index for performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_pmac_data_machine_time 
            ON pmac_data (machine_id, timestamp)
        """)
        
        # Insert sample data if table is empty
        cursor.execute("SELECT COUNT(*) FROM pmac_data")
        if cursor.fetchone()[0] == 0:
            self.insert_sample_data(cursor)
        
        conn.commit()
        conn.close()
        print(f"✅ Database initialized: {self.db_path}")
    
    def insert_sample_data(self, cursor):
        """Insert sample PMAC data"""
        print("📊 Inserting sample data...")
        
        # Generate sample data for the last 24 hours
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=24)
        
        data_points = []
        current_time = start_time
        
        while current_time <= end_time:
            # Generate data every 10 seconds
            for i in range(6):  # 6 data points per minute
                timestamp = current_time + timedelta(seconds=i*10)
                
                # Generate realistic PMAC data
                for machine_id in ["PMAC_001", "PMAC_002"]:
                    for var_type in ["P", "M", "D"]:
                        for addr in range(1, 6):
                            # Generate realistic values with some variation
                            base_value = 100 + addr * 10
                            noise = np.random.normal(0, 2)
                            value = base_value + noise + np.sin(timestamp.hour * 0.5) * 5
                            
                            data_points.append((
                                timestamp.isoformat(),
                                machine_id,
                                var_type,
                                addr,
                                round(value, 2),
                                "good",
                                f"job_{timestamp.hour:02d}"
                            ))
            
            current_time += timedelta(minutes=1)
        
        # Insert data in batches
        cursor.executemany("""
            INSERT INTO pmac_data (timestamp, machine_id, variable_type, variable_address, value, quality, collection_job_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, data_points)
        
        print(f"✅ Inserted {len(data_points)} sample data points")
    
    def get_data(self, machine_id: str, start_time: str, end_time: str, limit: int = 1000) -> List[Dict]:
        """Get PMAC data from SQLite"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT timestamp, machine_id, variable_type, variable_address, value, quality, collection_job_id
            FROM pmac_data 
            WHERE machine_id = ? AND timestamp >= ? AND timestamp <= ?
            ORDER BY timestamp DESC
            LIMIT ?
        """, (machine_id, start_time, end_time, limit))
        
        rows = cursor.fetchall()
        conn.close()
        
        # Convert to list of dictionaries
        data = []
        for row in rows:
            data.append({
                'timestamp': row[0],
                'machine_id': row[1],
                'variable_type': row[2],
                'variable_address': row[3],
                'value': row[4],
                'quality': row[5],
                'collection_job_id': row[6]
            })
        
        return data
    
    def get_machines(self) -> List[str]:
        """Get list of available machines"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT DISTINCT machine_id FROM pmac_data ORDER BY machine_id")
        machines = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        return machines

class SimpleAnalyticsService:
    """Simple analytics service"""
    
    def __init__(self, db: SimpleDatabase):
        self.db = db
    
    def get_statistics(self, machine_id: str, start_time: str, end_time: str) -> Dict:
        """Get basic statistics for data"""
        data = self.db.get_data(machine_id, start_time, end_time, limit=10000)
        
        if not data:
            return {"error": "No data found"}
        
        values = [row['value'] for row in data]
        
        return {
            "machine_id": machine_id,
            "period": {"start": start_time, "end": end_time},
            "data_points": len(data),
            "statistics": {
                "mean": round(np.mean(values), 3),
                "median": round(np.median(values), 3),
                "std": round(np.std(values), 3),
                "min": round(np.min(values), 3),
                "max": round(np.max(values), 3)
            }
        }
    
    def detect_trends(self, machine_id: str, start_time: str, end_time: str) -> Dict:
        """Detect trends in data"""
        data = self.db.get_data(machine_id, start_time, end_time, limit=1000)
        
        if not data:
            return {"error": "No data found"}
        
        # Sort by timestamp
        data.sort(key=lambda x: x['timestamp'])
        
        # Calculate trend using linear regression
        timestamps = [datetime.fromisoformat(row['timestamp']) for row in data]
        values = [row['value'] for row in data]
        
        # Convert timestamps to numeric values for regression
        time_numeric = [(t - timestamps[0]).total_seconds() for t in timestamps]
        
        # Simple linear regression
        if len(time_numeric) > 1:
            slope = np.polyfit(time_numeric, values, 1)[0]
            trend = "increasing" if slope > 0.01 else "decreasing" if slope < -0.01 else "stable"
            trend_strength = abs(slope)
        else:
            trend = "insufficient_data"
            trend_strength = 0
        
        return {
            "machine_id": machine_id,
            "trend": trend,
            "trend_strength": round(trend_strength, 6),
            "data_points": len(data)
        }
    
    def get_correlation(self, machine_id: str, start_time: str, end_time: str) -> Dict:
        """Get correlation between different variables"""
        data = self.db.get_data(machine_id, start_time, end_time, limit=1000)
        
        if not data:
            return {"error": "No data found"}
        
        # Group data by variable type and address
        variables = {}
        for row in data:
            key = f"{row['variable_type']}_{row['variable_address']}"
            if key not in variables:
                variables[key] = []
            variables[key].append(row['value'])
        
        # Calculate correlations
        correlations = {}
        var_keys = list(variables.keys())
        
        for i, key1 in enumerate(var_keys):
            for key2 in var_keys[i+1:]:
                if len(variables[key1]) > 1 and len(variables[key2]) > 1:
                    # Pad shorter arrays with NaN
                    max_len = max(len(variables[key1]), len(variables[key2]))
                    arr1 = np.array(variables[key1] + [np.nan] * (max_len - len(variables[key1])))
                    arr2 = np.array(variables[key2] + [np.nan] * (max_len - len(variables[key2])))
                    
                    # Remove NaN pairs
                    mask = ~(np.isnan(arr1) | np.isnan(arr2))
                    if np.sum(mask) > 1:
                        corr = np.corrcoef(arr1[mask], arr2[mask])[0, 1]
                        if not np.isnan(corr):
                            correlations[f"{key1}_vs_{key2}"] = round(corr, 3)
        
        return {
            "machine_id": machine_id,
            "correlations": correlations,
            "data_points": len(data)
        }

class SimpleChartService:
    """Simple chart generation service"""
    
    def __init__(self, db: SimpleDatabase):
        self.db = db
    
    def create_time_series_chart(self, machine_id: str, start_time: str, end_time: str) -> Dict:
        """Create a simple time series chart"""
        data = self.db.get_data(machine_id, start_time, end_time, limit=500)
        
        if not data:
            return {"error": "No data found"}
        
        # Group by variable type and address
        chart_data = {}
        for row in data:
            key = f"{row['variable_type']}_{row['variable_address']}"
            if key not in chart_data:
                chart_data[key] = {"timestamps": [], "values": []}
            
            chart_data[key]["timestamps"].append(row['timestamp'])
            chart_data[key]["values"].append(row['value'])
        
        return {
            "machine_id": machine_id,
            "chart_type": "time_series",
            "data": chart_data,
            "data_points": len(data)
        }

# Initialize services
db = SimpleDatabase()
analytics_service = SimpleAnalyticsService(db)
chart_service = SimpleChartService(db)

# API endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "PMAC Analytics Service (Simple)", "status": "running"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "analytics_simple",
        "timestamp": datetime.now().isoformat(),
        "database": "sqlite",
        "version": "1.0.0"
    }

@app.get("/api/analytics/machines")
async def get_machines():
    """Get list of available machines"""
    try:
        machines = db.get_machines()
        return {"machines": machines}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/statistics/{machine_id}")
async def get_statistics(machine_id: str, start_time: str = None, end_time: str = None):
    """Get statistics for a machine"""
    try:
        if not start_time:
            start_time = (datetime.now() - timedelta(hours=1)).isoformat()
        if not end_time:
            end_time = datetime.now().isoformat()
        
        stats = analytics_service.get_statistics(machine_id, start_time, end_time)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/trends/{machine_id}")
async def get_trends(machine_id: str, start_time: str = None, end_time: str = None):
    """Get trends for a machine"""
    try:
        if not start_time:
            start_time = (datetime.now() - timedelta(hours=1)).isoformat()
        if not end_time:
            end_time = datetime.now().isoformat()
        
        trends = analytics_service.detect_trends(machine_id, start_time, end_time)
        return trends
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/correlation/{machine_id}")
async def get_correlation(machine_id: str, start_time: str = None, end_time: str = None):
    """Get correlation analysis for a machine"""
    try:
        if not start_time:
            start_time = (datetime.now() - timedelta(hours=1)).isoformat()
        if not end_time:
            end_time = datetime.now().isoformat()
        
        correlation = analytics_service.get_correlation(machine_id, start_time, end_time)
        return correlation
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/charts/time-series/{machine_id}")
async def get_time_series_chart(machine_id: str, start_time: str = None, end_time: str = None):
    """Get time series chart data"""
    try:
        if not start_time:
            start_time = (datetime.now() - timedelta(hours=1)).isoformat()
        if not end_time:
            end_time = datetime.now().isoformat()
        
        chart = chart_service.create_time_series_chart(machine_id, start_time, end_time)
        return chart
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("🚀 Starting Simple PMAC Analytics Service")
    print("="*50)
    print("📊 Using SQLite database for simplicity")
    print("🌐 Service will be available at: http://localhost:3003")
    print("📚 API Documentation: http://localhost:3003/docs")
    print("\n⏹️  Press Ctrl+C to stop the service")
    
    uvicorn.run(
        "simple_analytics_service:app",
        host="0.0.0.0",
        port=3003,
        reload=True,
        log_level="info"
    )
