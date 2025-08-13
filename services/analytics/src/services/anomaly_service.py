"""
Anomaly detection service for PMAC data
Implements various anomaly detection algorithms including statistical and ML-based methods
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from scipy import stats
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import DBSCAN
from sklearn.neighbors import LocalOutlierFactor

from ..database import DatabaseService
from ..config import settings

logger = logging.getLogger(__name__)

class AnomalyService:
    """Service for detecting anomalies in PMAC data"""
    
    def __init__(self, database_service: DatabaseService):
        self.db = database_service
        self.scaler = StandardScaler()
    
    async def detect_statistical_anomalies(
        self,
        machine_id: str,
        variable_type: str,
        variable_address: int,
        start_time: datetime,
        end_time: datetime,
        method: str = "zscore",
        threshold: float = None
    ) -> Dict[str, Any]:
        """Detect anomalies using statistical methods"""
        try:
            # Get data from database
            data = await self.db.get_pmac_data(
                machine_id=machine_id,
                start_time=start_time,
                end_time=end_time,
                variable_types=[variable_type],
                variable_addresses=[variable_address]
            )
            
            if data.empty:
                return {
                    "error": "No data found for anomaly detection",
                    "data_points": 0
                }
            
            # Prepare data
            data = data.sort_values('timestamp').reset_index(drop=True)
            values = data['value'].dropna()
            
            if len(values) < 10:
                return {
                    "error": "Insufficient data for anomaly detection (need at least 10 points)",
                    "data_points": len(values)
                }
            
            # Set default threshold based on method
            if threshold is None:
                threshold = settings.anomaly_threshold
            
            anomalies = []
            anomaly_indices = []
            
            if method == "zscore":
                anomalies, anomaly_indices = self._detect_zscore_anomalies(values, threshold)
            elif method == "iqr":
                anomalies, anomaly_indices = self._detect_iqr_anomalies(values, threshold)
            elif method == "modified_zscore":
                anomalies, anomaly_indices = self._detect_modified_zscore_anomalies(values, threshold)
            elif method == "isolation_forest":
                anomalies, anomaly_indices = self._detect_isolation_forest_anomalies(values)
            else:
                raise ValueError(f"Unknown anomaly detection method: {method}")
            
            # Prepare anomaly details
            anomaly_details = []
            for idx in anomaly_indices:
                if idx < len(data):
                    anomaly_details.append({
                        "index": int(idx),
                        "timestamp": data.iloc[idx]['timestamp'].isoformat(),
                        "value": float(data.iloc[idx]['value']),
                        "deviation": float(anomalies[anomalies == values.iloc[idx]].iloc[0]) if len(anomalies) > 0 else None
                    })
            
            # Calculate statistics
            total_points = len(values)
            anomaly_count = len(anomaly_indices)
            anomaly_rate = (anomaly_count / total_points) * 100 if total_points > 0 else 0
            
            result = {
                "method": method,
                "threshold": threshold,
                "total_data_points": total_points,
                "anomaly_count": anomaly_count,
                "anomaly_rate_percent": float(anomaly_rate),
                "anomalies": anomaly_details,
                "statistics": {
                    "mean": float(values.mean()),
                    "std": float(values.std()),
                    "min": float(values.min()),
                    "max": float(values.max()),
                    "median": float(values.median())
                },
                "time_range": {
                    "start": start_time.isoformat(),
                    "end": end_time.isoformat()
                }
            }
            
            # Add severity assessment
            if anomaly_rate < 1:
                result["severity"] = "low"
            elif anomaly_rate < 5:
                result["severity"] = "medium"
            elif anomaly_rate < 10:
                result["severity"] = "high"
            else:
                result["severity"] = "critical"
            
            logger.info(f"Detected {anomaly_count} anomalies using {method} for {machine_id}.{variable_type}{variable_address}")
            return result
            
        except Exception as e:
            logger.error(f"Error detecting statistical anomalies: {e}")
            raise
    
    def _detect_zscore_anomalies(self, values: pd.Series, threshold: float) -> Tuple[pd.Series, List[int]]:
        """Detect anomalies using Z-score method"""
        z_scores = np.abs(stats.zscore(values))
        anomaly_mask = z_scores > threshold
        anomalies = values[anomaly_mask]
        anomaly_indices = values[anomaly_mask].index.tolist()
        return anomalies, anomaly_indices
    
    def _detect_iqr_anomalies(self, values: pd.Series, multiplier: float) -> Tuple[pd.Series, List[int]]:
        """Detect anomalies using IQR method"""
        Q1 = values.quantile(0.25)
        Q3 = values.quantile(0.75)
        IQR = Q3 - Q1
        
        lower_bound = Q1 - multiplier * IQR
        upper_bound = Q3 + multiplier * IQR
        
        anomaly_mask = (values < lower_bound) | (values > upper_bound)
        anomalies = values[anomaly_mask]
        anomaly_indices = values[anomaly_mask].index.tolist()
        return anomalies, anomaly_indices
    
    def _detect_modified_zscore_anomalies(self, values: pd.Series, threshold: float) -> Tuple[pd.Series, List[int]]:
        """Detect anomalies using Modified Z-score method (more robust to outliers)"""
        median = values.median()
        mad = np.median(np.abs(values - median))
        
        # Modified Z-score
        modified_z_scores = 0.6745 * (values - median) / mad if mad != 0 else np.zeros(len(values))
        anomaly_mask = np.abs(modified_z_scores) > threshold
        anomalies = values[anomaly_mask]
        anomaly_indices = values[anomaly_mask].index.tolist()
        return anomalies, anomaly_indices
    
    def _detect_isolation_forest_anomalies(self, values: pd.Series) -> Tuple[pd.Series, List[int]]:
        """Detect anomalies using Isolation Forest"""
        # Reshape for sklearn
        X = values.values.reshape(-1, 1)
        
        # Fit Isolation Forest
        iso_forest = IsolationForest(contamination=0.1, random_state=42)
        anomaly_labels = iso_forest.fit_predict(X)
        
        # Get anomalies (labeled as -1)
        anomaly_mask = anomaly_labels == -1
        anomalies = values[anomaly_mask]
        anomaly_indices = values[anomaly_mask].index.tolist()
        return anomalies, anomaly_indices
    
    async def detect_multivariate_anomalies(
        self,
        machine_id: str,
        start_time: datetime,
        end_time: datetime,
        variable_types: List[str] = None,
        method: str = "isolation_forest"
    ) -> Dict[str, Any]:
        """Detect anomalies using multiple variables"""
        try:
            # Get data from database
            data = await self.db.get_pmac_data(
                machine_id=machine_id,
                start_time=start_time,
                end_time=end_time,
                variable_types=variable_types
            )
            
            if data.empty:
                return {
                    "error": "No data found for multivariate anomaly detection",
                    "data_points": 0
                }
            
            # Pivot data to have variables as columns
            pivot_data = data.pivot_table(
                index='timestamp',
                columns=['variable_type', 'variable_address'],
                values='value',
                aggfunc='mean'
            )
            
            # Clean data
            pivot_data = pivot_data.dropna(axis=1, thresh=len(pivot_data) * 0.8)
            pivot_data = pivot_data.fillna(method='ffill').fillna(method='bfill')
            
            if pivot_data.shape[1] < 2:
                return {
                    "error": "Need at least 2 variables for multivariate anomaly detection",
                    "variables_found": pivot_data.shape[1]
                }
            
            # Standardize the data
            scaled_data = self.scaler.fit_transform(pivot_data)
            
            anomaly_indices = []
            anomaly_scores = []
            
            if method == "isolation_forest":
                anomaly_indices, anomaly_scores = self._detect_multivariate_isolation_forest(scaled_data)
            elif method == "local_outlier_factor":
                anomaly_indices, anomaly_scores = self._detect_multivariate_lof(scaled_data)
            elif method == "dbscan":
                anomaly_indices, anomaly_scores = self._detect_multivariate_dbscan(scaled_data)
            else:
                raise ValueError(f"Unknown multivariate anomaly detection method: {method}")
            
            # Prepare anomaly details
            anomaly_details = []
            for i, idx in enumerate(anomaly_indices):
                if idx < len(pivot_data):
                    anomaly_details.append({
                        "index": int(idx),
                        "timestamp": pivot_data.index[idx].isoformat(),
                        "anomaly_score": float(anomaly_scores[i]) if i < len(anomaly_scores) else None,
                        "values": {str(col): float(pivot_data.iloc[idx][col]) 
                                 for col in pivot_data.columns if not pd.isna(pivot_data.iloc[idx][col])}
                    })
            
            # Calculate statistics
            total_points = len(pivot_data)
            anomaly_count = len(anomaly_indices)
            anomaly_rate = (anomaly_count / total_points) * 100 if total_points > 0 else 0
            
            result = {
                "method": method,
                "total_data_points": total_points,
                "variables_analyzed": pivot_data.shape[1],
                "variable_names": [str(col) for col in pivot_data.columns],
                "anomaly_count": anomaly_count,
                "anomaly_rate_percent": float(anomaly_rate),
                "anomalies": anomaly_details,
                "time_range": {
                    "start": start_time.isoformat(),
                    "end": end_time.isoformat()
                }
            }
            
            # Add severity assessment
            if anomaly_rate < 1:
                result["severity"] = "low"
            elif anomaly_rate < 5:
                result["severity"] = "medium"
            elif anomaly_rate < 10:
                result["severity"] = "high"
            else:
                result["severity"] = "critical"
            
            logger.info(f"Detected {anomaly_count} multivariate anomalies using {method} for {machine_id}")
            return result
            
        except Exception as e:
            logger.error(f"Error detecting multivariate anomalies: {e}")
            raise
    
    def _detect_multivariate_isolation_forest(self, data: np.ndarray) -> Tuple[List[int], List[float]]:
        """Detect multivariate anomalies using Isolation Forest"""
        iso_forest = IsolationForest(contamination=0.1, random_state=42)
        anomaly_labels = iso_forest.fit_predict(data)
        anomaly_scores = iso_forest.score_samples(data)
        
        # Get anomaly indices (labeled as -1)
        anomaly_indices = np.where(anomaly_labels == -1)[0].tolist()
        anomaly_score_values = anomaly_scores[anomaly_labels == -1].tolist()
        
        return anomaly_indices, anomaly_score_values
    
    def _detect_multivariate_lof(self, data: np.ndarray) -> Tuple[List[int], List[float]]:
        """Detect multivariate anomalies using Local Outlier Factor"""
        n_neighbors = min(20, len(data) - 1)
        if n_neighbors < 1:
            return [], []
        
        lof = LocalOutlierFactor(n_neighbors=n_neighbors, contamination=0.1)
        anomaly_labels = lof.fit_predict(data)
        anomaly_scores = lof.negative_outlier_factor_
        
        # Get anomaly indices (labeled as -1)
        anomaly_indices = np.where(anomaly_labels == -1)[0].tolist()
        anomaly_score_values = anomaly_scores[anomaly_labels == -1].tolist()
        
        return anomaly_indices, anomaly_score_values
    
    def _detect_multivariate_dbscan(self, data: np.ndarray) -> Tuple[List[int], List[float]]:
        """Detect multivariate anomalies using DBSCAN clustering"""
        dbscan = DBSCAN(eps=0.5, min_samples=5)
        cluster_labels = dbscan.fit_predict(data)
        
        # Anomalies are points labeled as -1 (noise)
        anomaly_indices = np.where(cluster_labels == -1)[0].tolist()
        
        # For DBSCAN, we don't have scores, so we calculate distance to nearest cluster
        anomaly_scores = []
        if len(anomaly_indices) > 0:
            from sklearn.metrics.pairwise import euclidean_distances
            
            # Find cluster centers
            unique_labels = set(cluster_labels)
            if -1 in unique_labels:
                unique_labels.remove(-1)
            
            cluster_centers = []
            for label in unique_labels:
                cluster_mask = cluster_labels == label
                if np.any(cluster_mask):
                    center = np.mean(data[cluster_mask], axis=0)
                    cluster_centers.append(center)
            
            if cluster_centers:
                cluster_centers = np.array(cluster_centers)
                
                for idx in anomaly_indices:
                    point = data[idx].reshape(1, -1)
                    distances = euclidean_distances(point, cluster_centers)
                    min_distance = np.min(distances)
                    anomaly_scores.append(float(min_distance))
            else:
                anomaly_scores = [1.0] * len(anomaly_indices)  # Default score
        
        return anomaly_indices, anomaly_scores
    
    async def detect_time_series_anomalies(
        self,
        machine_id: str,
        variable_type: str,
        variable_address: int,
        start_time: datetime,
        end_time: datetime,
        window_size: int = None
    ) -> Dict[str, Any]:
        """Detect anomalies in time series using sliding window approach"""
        try:
            # Get data from database
            data = await self.db.get_pmac_data(
                machine_id=machine_id,
                start_time=start_time,
                end_time=end_time,
                variable_types=[variable_type],
                variable_addresses=[variable_address]
            )
            
            if data.empty:
                return {
                    "error": "No data found for time series anomaly detection",
                    "data_points": 0
                }
            
            # Prepare data
            data = data.sort_values('timestamp').reset_index(drop=True)
            values = data['value'].dropna()
            
            if window_size is None:
                window_size = min(settings.anomaly_window_size, len(values) // 4)
            
            if len(values) < window_size * 2:
                return {
                    "error": f"Insufficient data for time series anomaly detection (need at least {window_size * 2} points)",
                    "data_points": len(values)
                }
            
            anomalies = []
            
            # Sliding window anomaly detection
            for i in range(window_size, len(values) - window_size):
                # Current window
                window = values.iloc[i-window_size:i+window_size]
                current_value = values.iloc[i]
                
                # Calculate local statistics
                window_mean = window.mean()
                window_std = window.std()
                
                # Z-score relative to local window
                if window_std > 0:
                    local_zscore = abs(current_value - window_mean) / window_std
                    
                    # Check if it's an anomaly
                    if local_zscore > settings.anomaly_threshold:
                        anomaly_info = {
                            "index": int(i),
                            "timestamp": data.iloc[i]['timestamp'].isoformat(),
                            "value": float(current_value),
                            "local_mean": float(window_mean),
                            "local_std": float(window_std),
                            "local_zscore": float(local_zscore),
                            "window_size": window_size
                        }
                        
                        # Determine anomaly type
                        if current_value > window_mean + window_std * settings.anomaly_threshold:
                            anomaly_info["type"] = "spike"
                        elif current_value < window_mean - window_std * settings.anomaly_threshold:
                            anomaly_info["type"] = "dip"
                        else:
                            anomaly_info["type"] = "deviation"
                        
                        anomalies.append(anomaly_info)
            
            # Calculate statistics
            total_points = len(values)
            anomaly_count = len(anomalies)
            anomaly_rate = (anomaly_count / total_points) * 100 if total_points > 0 else 0
            
            # Group anomalies by type
            anomaly_types = {}
            for anomaly in anomalies:
                anomaly_type = anomaly["type"]
                if anomaly_type not in anomaly_types:
                    anomaly_types[anomaly_type] = 0
                anomaly_types[anomaly_type] += 1
            
            result = {
                "method": "time_series_sliding_window",
                "window_size": window_size,
                "threshold": settings.anomaly_threshold,
                "total_data_points": total_points,
                "anomaly_count": anomaly_count,
                "anomaly_rate_percent": float(anomaly_rate),
                "anomaly_types": anomaly_types,
                "anomalies": anomalies,
                "statistics": {
                    "mean": float(values.mean()),
                    "std": float(values.std()),
                    "min": float(values.min()),
                    "max": float(values.max())
                },
                "time_range": {
                    "start": start_time.isoformat(),
                    "end": end_time.isoformat()
                }
            }
            
            # Add severity assessment
            if anomaly_rate < 1:
                result["severity"] = "low"
            elif anomaly_rate < 5:
                result["severity"] = "medium"
            elif anomaly_rate < 10:
                result["severity"] = "high"
            else:
                result["severity"] = "critical"
            
            logger.info(f"Detected {anomaly_count} time series anomalies for {machine_id}.{variable_type}{variable_address}")
            return result
            
        except Exception as e:
            logger.error(f"Error detecting time series anomalies: {e}")
            raise
    
    async def get_anomaly_summary(
        self,
        machine_id: str,
        start_time: datetime,
        end_time: datetime
    ) -> Dict[str, Any]:
        """Get comprehensive anomaly summary for a machine"""
        try:
            # Get all variables for the machine
            variables = await self.db.get_variable_types(machine_id)
            
            if not variables:
                return {
                    "error": "No variables found for the specified machine",
                    "machine_id": machine_id
                }
            
            summary = {
                "machine_id": machine_id,
                "time_range": {
                    "start": start_time.isoformat(),
                    "end": end_time.isoformat()
                },
                "variables_analyzed": len(variables),
                "total_anomalies": 0,
                "severity_distribution": {"low": 0, "medium": 0, "high": 0, "critical": 0},
                "variable_anomalies": []
            }
            
            # Analyze each variable
            for variable in variables[:10]:  # Limit to first 10 variables
                try:
                    var_type = variable['variable_type']
                    var_addr = variable['variable_address']
                    
                    # Detect anomalies for this variable
                    anomaly_result = await self.detect_statistical_anomalies(
                        machine_id=machine_id,
                        variable_type=var_type,
                        variable_address=var_addr,
                        start_time=start_time,
                        end_time=end_time,
                        method="zscore"
                    )
                    
                    if "error" not in anomaly_result:
                        var_summary = {
                            "variable_type": var_type,
                            "variable_address": var_addr,
                            "anomaly_count": anomaly_result["anomaly_count"],
                            "anomaly_rate": anomaly_result["anomaly_rate_percent"],
                            "severity": anomaly_result["severity"],
                            "data_points": anomaly_result["total_data_points"]
                        }
                        
                        summary["variable_anomalies"].append(var_summary)
                        summary["total_anomalies"] += anomaly_result["anomaly_count"]
                        summary["severity_distribution"][anomaly_result["severity"]] += 1
                
                except Exception as var_error:
                    logger.warning(f"Error analyzing variable {var_type}{var_addr}: {var_error}")
                    continue
            
            # Calculate overall severity
            if summary["severity_distribution"]["critical"] > 0:
                summary["overall_severity"] = "critical"
            elif summary["severity_distribution"]["high"] > 0:
                summary["overall_severity"] = "high"
            elif summary["severity_distribution"]["medium"] > 0:
                summary["overall_severity"] = "medium"
            else:
                summary["overall_severity"] = "low"
            
            logger.info(f"Generated anomaly summary for {machine_id} ({summary['total_anomalies']} total anomalies)")
            return summary
            
        except Exception as e:
            logger.error(f"Error generating anomaly summary: {e}")
            raise
