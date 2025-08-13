"""
Database service for Analytics Module
Handles connection to PostgreSQL database to fetch PMAC data
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import pandas as pd
import asyncpg
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from .config import settings

logger = logging.getLogger(__name__)

class DatabaseService:
    """Database service for analytics data access"""
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.engine = None
        self.async_engine = None
        self.is_connected = False
        
    async def connect(self):
        """Connect to PostgreSQL database"""
        try:
            # Create connection pool
            self.pool = await asyncpg.create_pool(
                host=settings.db_host,
                port=settings.db_port,
                database=settings.db_name,
                user=settings.db_user,
                password=settings.db_password,
                ssl=settings.db_ssl,
                min_size=5,
                max_size=20,
                command_timeout=30
            )
            
            # Create SQLAlchemy engines for pandas integration
            connection_string = f"postgresql://{settings.db_user}:{settings.db_password}@{settings.db_host}:{settings.db_port}/{settings.db_name}"
            async_connection_string = f"postgresql+asyncpg://{settings.db_user}:{settings.db_password}@{settings.db_host}:{settings.db_port}/{settings.db_name}"
            
            self.engine = create_engine(connection_string)
            self.async_engine = create_async_engine(async_connection_string)
            
            # Test connection
            async with self.pool.acquire() as conn:
                await conn.fetchval('SELECT 1')
            
            self.is_connected = True
            logger.info("Connected to PostgreSQL database")
            
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            self.is_connected = False
            raise
    
    async def disconnect(self):
        """Disconnect from database"""
        try:
            if self.pool:
                await self.pool.close()
            if self.async_engine:
                await self.async_engine.dispose()
            self.is_connected = False
            logger.info("Disconnected from database")
        except Exception as e:
            logger.error(f"Error disconnecting from database: {e}")
    
    async def health_check(self) -> bool:
        """Check database connection health"""
        try:
            if not self.pool:
                return False
            async with self.pool.acquire() as conn:
                result = await conn.fetchval('SELECT 1')
                return result == 1
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False
    
    async def get_pmac_data(
        self,
        machine_id: str,
        start_time: datetime,
        end_time: datetime,
        variable_types: Optional[List[str]] = None,
        variable_addresses: Optional[List[int]] = None,
        limit: int = 10000
    ) -> pd.DataFrame:
        """Get PMAC data for analytics"""
        try:
            query = """
                SELECT 
                    timestamp,
                    machine_id,
                    variable_type,
                    variable_address,
                    value,
                    quality,
                    collection_job_id
                FROM pmac_data 
                WHERE machine_id = $1 
                AND timestamp >= $2 
                AND timestamp <= $3
            """
            params = [machine_id, start_time, end_time]
            param_count = 3
            
            if variable_types:
                param_count += 1
                query += f" AND variable_type = ANY(${param_count})"
                params.append(variable_types)
            
            if variable_addresses:
                param_count += 1
                query += f" AND variable_address = ANY(${param_count})"
                params.append(variable_addresses)
            
            param_count += 1
            query += f" ORDER BY timestamp DESC LIMIT ${param_count}"
            params.append(limit)
            
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query, *params)
            
            # Convert to pandas DataFrame
            data = [dict(row) for row in rows]
            df = pd.DataFrame(data)
            
            if not df.empty:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                df = df.sort_values('timestamp')
            
            logger.info(f"Retrieved {len(df)} data points for machine {machine_id}")
            return df
            
        except Exception as e:
            logger.error(f"Error getting PMAC data: {e}")
            raise
    
    async def get_aggregated_data(
        self,
        machine_id: str,
        start_time: datetime,
        end_time: datetime,
        interval: str = '1 hour',
        variable_types: Optional[List[str]] = None
    ) -> pd.DataFrame:
        """Get aggregated PMAC data for analytics"""
        try:
            query = f"""
                SELECT 
                    time_bucket('{interval}', timestamp) as time_bucket,
                    variable_type,
                    variable_address,
                    AVG(value) as avg_value,
                    MIN(value) as min_value,
                    MAX(value) as max_value,
                    STDDEV(value) as std_value,
                    COUNT(*) as count
                FROM pmac_data 
                WHERE machine_id = $1 
                AND timestamp >= $2 
                AND timestamp <= $3
            """
            params = [machine_id, start_time, end_time]
            
            if variable_types:
                query += " AND variable_type = ANY($4)"
                params.append(variable_types)
            
            query += """
                GROUP BY time_bucket, variable_type, variable_address
                ORDER BY time_bucket, variable_type, variable_address
            """
            
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query, *params)
            
            # Convert to pandas DataFrame
            data = [dict(row) for row in rows]
            df = pd.DataFrame(data)
            
            if not df.empty:
                df['time_bucket'] = pd.to_datetime(df['time_bucket'])
            
            logger.info(f"Retrieved {len(df)} aggregated data points for machine {machine_id}")
            return df
            
        except Exception as e:
            logger.error(f"Error getting aggregated data: {e}")
            raise
    
    async def get_latest_data(
        self,
        machine_id: str,
        variable_types: Optional[List[str]] = None,
        limit: int = 100
    ) -> pd.DataFrame:
        """Get latest PMAC data points"""
        try:
            query = """
                SELECT DISTINCT ON (variable_type, variable_address)
                    timestamp,
                    machine_id,
                    variable_type,
                    variable_address,
                    value,
                    quality
                FROM pmac_data 
                WHERE machine_id = $1
            """
            params = [machine_id]
            
            if variable_types:
                query += " AND variable_type = ANY($2)"
                params.append(variable_types)
            
            query += """
                ORDER BY variable_type, variable_address, timestamp DESC
                LIMIT $""" + str(len(params) + 1)
            params.append(limit)
            
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query, *params)
            
            # Convert to pandas DataFrame
            data = [dict(row) for row in rows]
            df = pd.DataFrame(data)
            
            if not df.empty:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
            
            logger.info(f"Retrieved {len(df)} latest data points for machine {machine_id}")
            return df
            
        except Exception as e:
            logger.error(f"Error getting latest data: {e}")
            raise
    
    async def get_machine_list(self) -> List[str]:
        """Get list of available machines"""
        try:
            query = "SELECT DISTINCT machine_id FROM pmac_data ORDER BY machine_id"
            
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query)
            
            machines = [row['machine_id'] for row in rows]
            logger.info(f"Found {len(machines)} machines")
            return machines
            
        except Exception as e:
            logger.error(f"Error getting machine list: {e}")
            raise
    
    async def get_variable_types(self, machine_id: str) -> List[Dict[str, Any]]:
        """Get available variable types for a machine"""
        try:
            query = """
                SELECT 
                    variable_type,
                    variable_address,
                    COUNT(*) as data_points,
                    MIN(timestamp) as first_seen,
                    MAX(timestamp) as last_seen
                FROM pmac_data 
                WHERE machine_id = $1
                GROUP BY variable_type, variable_address
                ORDER BY variable_type, variable_address
            """
            
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query, machine_id)
            
            variables = []
            for row in rows:
                variables.append({
                    'variable_type': row['variable_type'],
                    'variable_address': row['variable_address'],
                    'data_points': row['data_points'],
                    'first_seen': row['first_seen'],
                    'last_seen': row['last_seen']
                })
            
            logger.info(f"Found {len(variables)} variable types for machine {machine_id}")
            return variables
            
        except Exception as e:
            logger.error(f"Error getting variable types: {e}")
            raise
