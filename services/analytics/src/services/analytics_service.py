"""
Analytics service for PMAC data analysis
Provides statistical analysis, trend detection, and data insights
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from scipy import stats
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans

from ..database import DatabaseService
from ..config import settings

logger = logging.getLogger(__name__)

class AnalyticsService:
    """Service for performing analytics on PMAC data"""
    
    def __init__(self, database_service: DatabaseService):
        self.db = database_service
        self.scaler = StandardScaler()
    
    def get_current_timestamp(self) -> str:
        """Get current timestamp as ISO string"""
        return datetime.now().isoformat()
    
    async def get_basic_statistics(
        self,
        machine_id: str,
        variable_type: str,
        variable_address: int,
        start_time: datetime,
        end_time: datetime
    ) -> Dict[str, Any]:
        """Calculate basic statistics for a variable"""
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
                    "error": "No data found for the specified parameters",
                    "data_points": 0
                }
            
            values = data['value'].dropna()
            
            if len(values) == 0:
                return {
                    "error": "No valid numeric values found",
                    "data_points": 0
                }
            
            # Calculate basic statistics
            statistics = {
                "data_points": len(values),
                "mean": float(values.mean()),
                "median": float(values.median()),
                "std": float(values.std()),
                "var": float(values.var()),
                "min": float(values.min()),
                "max": float(values.max()),
                "range": float(values.max() - values.min()),
                "q1": float(values.quantile(0.25)),
                "q3": float(values.quantile(0.75)),
                "iqr": float(values.quantile(0.75) - values.quantile(0.25)),
                "skewness": float(stats.skew(values)),
                "kurtosis": float(stats.kurtosis(values)),
                "cv": float(values.std() / values.mean()) if values.mean() != 0 else None
            }
            
            # Add time range information
            statistics.update({
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration_hours": (end_time - start_time).total_seconds() / 3600,
                "first_reading": data['timestamp'].min().isoformat(),
                "last_reading": data['timestamp'].max().isoformat()
            })
            
            logger.info(f"Calculated statistics for {machine_id}.{variable_type}{variable_address}")
            return statistics
            
        except Exception as e:
            logger.error(f"Error calculating statistics: {e}")
            raise
    
    async def detect_trends(
        self,
        machine_id: str,
        variable_type: str,
        variable_address: int,
        start_time: datetime,
        end_time: datetime,
        window_size: int = 50
    ) -> Dict[str, Any]:
        """Detect trends in time series data"""
        try:
            # Get data from database
            data = await self.db.get_pmac_data(
                machine_id=machine_id,
                start_time=start_time,
                end_time=end_time,
                variable_types=[variable_type],
                variable_addresses=[variable_address]
            )
            
            if data.empty or len(data) < window_size:
                return {
                    "error": f"Insufficient data for trend detection (need at least {window_size} points)",
                    "data_points": len(data)
                }
            
            # Prepare data
            data = data.sort_values('timestamp').reset_index(drop=True)
            values = data['value'].dropna()
            
            if len(values) < window_size:
                return {
                    "error": "Insufficient valid data points for trend detection",
                    "data_points": len(values)
                }
            
            # Calculate moving averages
            short_ma = values.rolling(window=window_size//2).mean()
            long_ma = values.rolling(window=window_size).mean()
            
            # Linear regression for overall trend
            x = np.arange(len(values))
            slope, intercept, r_value, p_value, std_err = stats.linregress(x, values)
            
            # Determine trend direction
            trend_direction = "increasing" if slope > 0 else "decreasing" if slope < 0 else "stable"
            trend_strength = abs(r_value)
            
            # Detect trend changes
            trend_changes = self._detect_trend_changes(values, window_size)
            
            # Calculate volatility
            returns = values.pct_change().dropna()
            volatility = returns.std() * np.sqrt(len(returns))
            
            trends = {
                "overall_trend": {
                    "direction": trend_direction,
                    "slope": float(slope),
                    "strength": float(trend_strength),
                    "r_squared": float(r_value ** 2),
                    "p_value": float(p_value),
                    "confidence": "high" if p_value < 0.01 else "medium" if p_value < 0.05 else "low"
                },
                "volatility": {
                    "value": float(volatility),
                    "level": "high" if volatility > 0.1 else "medium" if volatility > 0.05 else "low"
                },
                "trend_changes": trend_changes,
                "moving_averages": {
                    "short_period": window_size // 2,
                    "long_period": window_size,
                    "current_short_ma": float(short_ma.iloc[-1]) if not pd.isna(short_ma.iloc[-1]) else None,
                    "current_long_ma": float(long_ma.iloc[-1]) if not pd.isna(long_ma.iloc[-1]) else None,
                    "crossover": "bullish" if short_ma.iloc[-1] > long_ma.iloc[-1] else "bearish"
                },
                "data_points": len(values),
                "analysis_window": window_size
            }
            
            logger.info(f"Detected trends for {machine_id}.{variable_type}{variable_address}")
            return trends
            
        except Exception as e:
            logger.error(f"Error detecting trends: {e}")
            raise
    
    def _detect_trend_changes(self, values: pd.Series, window_size: int) -> List[Dict[str, Any]]:
        """Detect significant trend changes in the data"""
        changes = []
        
        if len(values) < window_size * 2:
            return changes
        
        # Calculate rolling slopes
        slopes = []
        for i in range(window_size, len(values) - window_size):
            x = np.arange(window_size)
            y = values.iloc[i-window_size//2:i+window_size//2]
            if len(y) == window_size:
                slope, _, _, _, _ = stats.linregress(x, y)
                slopes.append((i, slope))
        
        # Find significant slope changes
        if len(slopes) > 1:
            slope_values = [s[1] for s in slopes]
            slope_std = np.std(slope_values)
            
            for i in range(1, len(slopes)):
                prev_slope = slopes[i-1][1]
                curr_slope = slopes[i][1]
                slope_change = abs(curr_slope - prev_slope)
                
                if slope_change > 2 * slope_std:  # Significant change
                    changes.append({
                        "index": slopes[i][0],
                        "timestamp": values.index[slopes[i][0]],
                        "previous_slope": float(prev_slope),
                        "current_slope": float(curr_slope),
                        "change_magnitude": float(slope_change),
                        "change_type": "reversal" if prev_slope * curr_slope < 0 else "acceleration"
                    })
        
        return changes
    
    async def calculate_correlations(
        self,
        machine_id: str,
        start_time: datetime,
        end_time: datetime,
        variable_types: List[str] = None
    ) -> Dict[str, Any]:
        """Calculate correlations between different variables"""
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
                    "error": "No data found for correlation analysis",
                    "data_points": 0
                }
            
            # Pivot data to have variables as columns
            pivot_data = data.pivot_table(
                index='timestamp',
                columns=['variable_type', 'variable_address'],
                values='value',
                aggfunc='mean'
            )
            
            if pivot_data.shape[1] < 2:
                return {
                    "error": "Need at least 2 variables for correlation analysis",
                    "variables_found": pivot_data.shape[1]
                }
            
            # Calculate correlation matrix
            correlation_matrix = pivot_data.corr()
            
            # Find strong correlations (> 0.7 or < -0.7)
            strong_correlations = []
            for i in range(len(correlation_matrix.columns)):
                for j in range(i + 1, len(correlation_matrix.columns)):
                    corr_value = correlation_matrix.iloc[i, j]
                    if not pd.isna(corr_value) and abs(corr_value) > 0.7:
                        strong_correlations.append({
                            "variable1": str(correlation_matrix.columns[i]),
                            "variable2": str(correlation_matrix.columns[j]),
                            "correlation": float(corr_value),
                            "strength": "very_strong" if abs(corr_value) > 0.9 else "strong",
                            "direction": "positive" if corr_value > 0 else "negative"
                        })
            
            # Convert correlation matrix to serializable format
            corr_dict = {}
            for col in correlation_matrix.columns:
                corr_dict[str(col)] = {}
                for row in correlation_matrix.index:
                    value = correlation_matrix.loc[row, col]
                    corr_dict[str(col)][str(row)] = float(value) if not pd.isna(value) else None
            
            correlations = {
                "correlation_matrix": corr_dict,
                "strong_correlations": strong_correlations,
                "variable_count": pivot_data.shape[1],
                "data_points": len(pivot_data),
                "time_range": {
                    "start": start_time.isoformat(),
                    "end": end_time.isoformat()
                }
            }
            
            logger.info(f"Calculated correlations for {machine_id} ({len(strong_correlations)} strong correlations found)")
            return correlations
            
        except Exception as e:
            logger.error(f"Error calculating correlations: {e}")
            raise
    
    async def perform_pca_analysis(
        self,
        machine_id: str,
        start_time: datetime,
        end_time: datetime,
        variable_types: List[str] = None,
        n_components: int = None
    ) -> Dict[str, Any]:
        """Perform Principal Component Analysis"""
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
                    "error": "No data found for PCA analysis",
                    "data_points": 0
                }
            
            # Pivot data to have variables as columns
            pivot_data = data.pivot_table(
                index='timestamp',
                columns=['variable_type', 'variable_address'],
                values='value',
                aggfunc='mean'
            )
            
            # Remove columns with too many NaN values
            pivot_data = pivot_data.dropna(axis=1, thresh=len(pivot_data) * 0.8)
            pivot_data = pivot_data.fillna(method='ffill').fillna(method='bfill')
            
            if pivot_data.shape[1] < 2:
                return {
                    "error": "Need at least 2 variables for PCA analysis",
                    "variables_found": pivot_data.shape[1]
                }
            
            # Standardize the data
            scaled_data = self.scaler.fit_transform(pivot_data)
            
            # Perform PCA
            if n_components is None:
                n_components = min(pivot_data.shape[1], 10)  # Limit to 10 components
            
            pca = PCA(n_components=n_components)
            pca_result = pca.fit_transform(scaled_data)
            
            # Calculate cumulative explained variance
            cumulative_variance = np.cumsum(pca.explained_variance_ratio_)
            
            # Find number of components for 95% variance
            components_95 = np.argmax(cumulative_variance >= 0.95) + 1
            
            pca_analysis = {
                "explained_variance_ratio": pca.explained_variance_ratio_.tolist(),
                "cumulative_variance": cumulative_variance.tolist(),
                "components_for_95_variance": int(components_95),
                "total_variance_explained": float(cumulative_variance[-1]),
                "component_loadings": pca.components_.tolist(),
                "variable_names": [str(col) for col in pivot_data.columns],
                "n_components": n_components,
                "data_points": len(pivot_data),
                "variables_analyzed": pivot_data.shape[1]
            }
            
            # Add interpretation
            if components_95 <= 3:
                pca_analysis["interpretation"] = "Data can be well represented in low dimensions"
            elif components_95 <= 5:
                pca_analysis["interpretation"] = "Data has moderate dimensionality"
            else:
                pca_analysis["interpretation"] = "Data is high-dimensional with complex relationships"
            
            logger.info(f"Performed PCA analysis for {machine_id} ({n_components} components)")
            return pca_analysis
            
        except Exception as e:
            logger.error(f"Error performing PCA analysis: {e}")
            raise
    
    async def detect_operational_modes(
        self,
        machine_id: str,
        start_time: datetime,
        end_time: datetime,
        n_clusters: int = None
    ) -> Dict[str, Any]:
        """Detect different operational modes using clustering"""
        try:
            # Get data from database
            data = await self.db.get_pmac_data(
                machine_id=machine_id,
                start_time=start_time,
                end_time=end_time
            )
            
            if data.empty:
                return {
                    "error": "No data found for operational mode detection",
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
            
            if pivot_data.shape[1] < 2 or len(pivot_data) < 10:
                return {
                    "error": "Insufficient data for clustering analysis",
                    "variables_found": pivot_data.shape[1],
                    "data_points": len(pivot_data)
                }
            
            # Standardize the data
            scaled_data = self.scaler.fit_transform(pivot_data)
            
            # Determine optimal number of clusters if not provided
            if n_clusters is None:
                n_clusters = self._find_optimal_clusters(scaled_data)
            
            # Perform K-means clustering
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(scaled_data)
            
            # Analyze clusters
            cluster_analysis = []
            for i in range(n_clusters):
                cluster_mask = cluster_labels == i
                cluster_data = pivot_data[cluster_mask]
                
                if len(cluster_data) > 0:
                    cluster_info = {
                        "cluster_id": i,
                        "data_points": len(cluster_data),
                        "percentage": float(len(cluster_data) / len(pivot_data) * 100),
                        "start_time": cluster_data.index.min().isoformat(),
                        "end_time": cluster_data.index.max().isoformat(),
                        "duration_hours": (cluster_data.index.max() - cluster_data.index.min()).total_seconds() / 3600,
                        "characteristics": {}
                    }
                    
                    # Calculate cluster characteristics
                    for col in pivot_data.columns:
                        if col in cluster_data.columns:
                            values = cluster_data[col].dropna()
                            if len(values) > 0:
                                cluster_info["characteristics"][str(col)] = {
                                    "mean": float(values.mean()),
                                    "std": float(values.std()),
                                    "min": float(values.min()),
                                    "max": float(values.max())
                                }
                    
                    cluster_analysis.append(cluster_info)
            
            # Calculate cluster transitions
            transitions = self._analyze_cluster_transitions(cluster_labels, pivot_data.index)
            
            operational_modes = {
                "n_clusters": n_clusters,
                "clusters": cluster_analysis,
                "transitions": transitions,
                "total_data_points": len(pivot_data),
                "variables_analyzed": pivot_data.shape[1],
                "cluster_labels": cluster_labels.tolist(),
                "timestamps": [ts.isoformat() for ts in pivot_data.index]
            }
            
            logger.info(f"Detected {n_clusters} operational modes for {machine_id}")
            return operational_modes
            
        except Exception as e:
            logger.error(f"Error detecting operational modes: {e}")
            raise
    
    def _find_optimal_clusters(self, data: np.ndarray, max_clusters: int = 10) -> int:
        """Find optimal number of clusters using elbow method"""
        if len(data) < max_clusters:
            max_clusters = len(data) - 1
        
        if max_clusters < 2:
            return 2
        
        inertias = []
        k_range = range(2, min(max_clusters + 1, 11))
        
        for k in k_range:
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            kmeans.fit(data)
            inertias.append(kmeans.inertia_)
        
        # Find elbow point
        if len(inertias) < 2:
            return 2
        
        # Calculate the rate of change
        rates = []
        for i in range(1, len(inertias)):
            rate = inertias[i-1] - inertias[i]
            rates.append(rate)
        
        # Find the point where the rate of change drops significantly
        if len(rates) < 2:
            return 2
        
        rate_changes = []
        for i in range(1, len(rates)):
            change = rates[i-1] - rates[i]
            rate_changes.append(change)
        
        if rate_changes:
            optimal_idx = np.argmax(rate_changes)
            return k_range[optimal_idx + 1]
        
        return 3  # Default
    
    def _analyze_cluster_transitions(self, cluster_labels: np.ndarray, timestamps: pd.DatetimeIndex) -> List[Dict[str, Any]]:
        """Analyze transitions between clusters"""
        transitions = []
        
        for i in range(1, len(cluster_labels)):
            if cluster_labels[i] != cluster_labels[i-1]:
                transitions.append({
                    "from_cluster": int(cluster_labels[i-1]),
                    "to_cluster": int(cluster_labels[i]),
                    "timestamp": timestamps[i].isoformat(),
                    "index": i
                })
        
        return transitions
