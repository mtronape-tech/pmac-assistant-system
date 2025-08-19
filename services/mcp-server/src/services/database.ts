import Database from "better-sqlite3";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export class DatabaseService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    // Используем SQLite файл в корне проекта
    this.dbPath = join(__dirname, "../../../analytics.db");
  }

  async connect(): Promise<void> {
    try {
      this.db = new Database(this.dbPath);
      
      // Включаем WAL режим для лучшей производительности
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("synchronous = NORMAL");
      this.db.pragma("cache_size = 10000");
      this.db.pragma("temp_store = MEMORY");

      // Создаем таблицы если их нет
      await this.initTables();

      logger.info("Подключение к SQLite установлено");
    } catch (error) {
      logger.error("Ошибка подключения к SQLite:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      logger.info("Подключение к SQLite закрыто");
    }
  }

  private async initTables(): Promise<void> {
    if (!this.db) return;

    // Создаем таблицу для PMAC данных
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pmac_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        machine_id TEXT NOT NULL,
        variable_type TEXT,
        variable_address INTEGER,
        value REAL,
        quality TEXT DEFAULT 'good',
        collection_job_id TEXT
      )
    `);

    // Создаем таблицу для конфигураций
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pmac_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        machine_id TEXT NOT NULL,
        config_type TEXT NOT NULL,
        config_data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Создаем таблицу для заданий
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pmac_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_type TEXT NOT NULL,
        status TEXT NOT NULL,
        machine_id TEXT,
        parameters TEXT,
        result TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT
      )
    `);

    // Создаем индексы
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_pmac_data_machine_time 
      ON pmac_data (machine_id, timestamp DESC)
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_pmac_configs_machine 
      ON pmac_configs (machine_id, config_type)
    `);

    logger.info("Таблицы SQLite инициализированы");
  }

  async query(text: string, params: any[] = []): Promise<any> {
    if (!this.db) {
      throw new Error("База данных не подключена");
    }

    const start = Date.now();
    try {
      const stmt = this.db.prepare(text);
      const result = stmt.all(params);
      const duration = Date.now() - start;
      
      logger.debug("Выполнен SQL запрос", {
        text,
        duration,
        rows: Array.isArray(result) ? result.length : 1,
      });
      
      return { rows: result, rowCount: Array.isArray(result) ? result.length : 1 };
    } catch (error) {
      const duration = Date.now() - start;
      logger.error("Ошибка SQL запроса", {
        text,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    if (!this.db) {
      throw new Error("База данных не подключена");
    }

    try {
      this.db.exec("BEGIN TRANSACTION");
      const result = await callback();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  // Методы для работы с PMAC данными
  async savePMACData(data: {
    machineId: string;
    variableType: string;
    variableAddress: number;
    value: number;
    quality?: string;
  }): Promise<void> {
    const query = `
      INSERT INTO pmac_data (timestamp, machine_id, variable_type, variable_address, value, quality)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await this.query(query, [
      new Date().toISOString(),
      data.machineId,
      data.variableType,
      data.variableAddress,
      data.value,
      data.quality || 'good'
    ]);
  }

  async getPMACData(machineId: string, limit: number = 100): Promise<any[]> {
    const query = `
      SELECT * FROM pmac_data 
      WHERE machine_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `;
    
    const result = await this.query(query, [machineId, limit]);
    return result.rows;
  }

  async getPMACDataAdvanced(
    machineId: string, 
    variableType?: string, 
    address?: number, 
    startTime?: Date, 
    endTime?: Date, 
    limit: number = 100
  ): Promise<any[]> {
    let query = `
      SELECT * FROM pmac_data 
      WHERE machine_id = ?
    `;
    const params: any[] = [machineId];

    if (variableType) {
      query += ` AND variable_type = ?`;
      params.push(variableType);
    }

    if (address !== undefined) {
      query += ` AND variable_address = ?`;
      params.push(address);
    }

    if (startTime) {
      query += ` AND timestamp >= ?`;
      params.push(startTime.toISOString());
    }

    if (endTime) {
      query += ` AND timestamp <= ?`;
      params.push(endTime.toISOString());
    }

    query += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(limit);

    const result = await this.query(query, params);
    return result.rows;
  }

  async saveConfig(machineId: string, configType: string, configData: any): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO pmac_configs (machine_id, config_type, config_data, updated_at)
      VALUES (?, ?, ?, ?)
    `;
    
    await this.query(query, [
      machineId,
      configType,
      JSON.stringify(configData),
      new Date().toISOString()
    ]);
  }

  async getConfig(machineId: string, configType: string): Promise<any> {
    const query = `
      SELECT config_data FROM pmac_configs 
      WHERE machine_id = ? AND config_type = ?
    `;
    
    const result = await this.query(query, [machineId, configType]);
    if (result.rows.length > 0) {
      return JSON.parse(result.rows[0].config_data);
    }
    return null;
  }

  async createJob(jobType: string, machineId?: string, parameters?: any): Promise<number> {
    const query = `
      INSERT INTO pmac_jobs (job_type, status, machine_id, parameters)
      VALUES (?, ?, ?, ?)
    `;
    
    const result = await this.query(query, [
      jobType,
      'pending',
      machineId || null,
      parameters ? JSON.stringify(parameters) : null
    ]);
    
    // Возвращаем ID созданного задания
    return result.rows[0]?.id || 0;
  }

  async updateJobStatus(jobId: number, status: string, result?: any): Promise<void> {
    const query = `
      UPDATE pmac_jobs 
      SET status = ?, result = ?, completed_at = ?
      WHERE id = ?
    `;
    
    await this.query(query, [
      status,
      result ? JSON.stringify(result) : null,
      status === 'completed' ? new Date().toISOString() : null,
      jobId
    ]);
  }

  async getJobStatus(jobId: number): Promise<any> {
    const query = `
      SELECT * FROM pmac_jobs WHERE id = ?
    `;
    
    const result = await this.query(query, [jobId]);
    if (result.rows.length > 0) {
      const job = result.rows[0];
      return {
        ...job,
        parameters: job.parameters ? JSON.parse(job.parameters) : null,
        result: job.result ? JSON.parse(job.result) : null
      };
    }
    return null;
  }

  // Методы для работы с документами
  async searchDocuments(query: string, limit: number = 10): Promise<any[]> {
    const searchQuery = `
      SELECT * FROM pmac_data 
      WHERE variable_type LIKE ? OR machine_id LIKE ?
      ORDER BY timestamp DESC 
      LIMIT ?
    `;
    
    const searchTerm = `%${query}%`;
    const result = await this.query(searchQuery, [searchTerm, searchTerm, limit]);
    return result.rows;
  }

  async saveDocument(document: {
    title: string;
    content: string;
    metadata: any;
  }): Promise<number> {
    const query = `
      INSERT INTO pmac_data (timestamp, machine_id, variable_type, variable_address, value, quality)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const result = await this.query(query, [
      new Date().toISOString(),
      document.metadata.type || 'document',
      document.title,
      0, // address
      document.content.length, // value как длина контента
      'good'
    ]);
    
    return result.rows[0]?.id || 0;
  }
}
