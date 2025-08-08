import { Pool, PoolClient } from "pg";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

export class DatabaseService {
  private pool: Pool | null = null;

  async connect(): Promise<void> {
    try {
      this.pool = new Pool({
        connectionString: config.database.url,
        ssl: config.database.ssl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Проверяем подключение
      const client = await this.pool.connect();
      await client.query("SELECT NOW()");
      client.release();

      logger.info("Подключение к PostgreSQL установлено");
    } catch (error) {
      logger.error("Ошибка подключения к PostgreSQL:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info("Подключение к PostgreSQL закрыто");
    }
  }

  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error("База данных не подключена");
    }
    return this.pool.connect();
  }

  async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error("База данных не подключена");
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug("Выполнен SQL запрос", {
        text,
        duration,
        rows: result.rowCount,
      });
      
      return result;
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

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error("База данных не подключена");
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
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
      INSERT INTO pmac_data (time, machine_id, variable_type, variable_address, value, quality)
      VALUES (NOW(), $1, $2, $3, $4, $5)
    `;
    
    await this.query(query, [
      data.machineId,
      data.variableType,
      data.variableAddress,
      data.value,
      data.quality || "good",
    ]);
  }

  async getPMACData(
    machineId: string,
    variableType?: string,
    variableAddress?: number,
    startTime?: Date,
    endTime?: Date,
    limit: number = 1000
  ): Promise<any[]> {
    let query = `
      SELECT time, machine_id, variable_type, variable_address, value, quality
      FROM pmac_data
      WHERE machine_id = $1
    `;
    
    const params: any[] = [machineId];
    let paramIndex = 2;

    if (variableType) {
      query += ` AND variable_type = $${paramIndex}`;
      params.push(variableType);
      paramIndex++;
    }

    if (variableAddress !== undefined) {
      query += ` AND variable_address = $${paramIndex}`;
      params.push(variableAddress);
      paramIndex++;
    }

    if (startTime) {
      query += ` AND time >= $${paramIndex}`;
      params.push(startTime);
      paramIndex++;
    }

    if (endTime) {
      query += ` AND time <= $${paramIndex}`;
      params.push(endTime);
      paramIndex++;
    }

    query += ` ORDER BY time DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await this.query(query, params);
    return result.rows;
  }

  // Методы для работы с документами
  async saveDocument(document: {
    title: string;
    content: string;
    metadata: any;
  }): Promise<string> {
    const query = `
      INSERT INTO documents (title, content, metadata)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    
    const result = await this.query(query, [
      document.title,
      document.content,
      JSON.stringify(document.metadata),
    ]);
    
    return result.rows[0].id;
  }

  async getDocument(documentId: string): Promise<any> {
    const query = `
      SELECT id, title, content, metadata, created_at, updated_at
      FROM documents
      WHERE id = $1
    `;
    
    const result = await this.query(query, [documentId]);
    return result.rows[0] || null;
  }

  async saveDocumentChunk(chunk: {
    documentId: string;
    content: string;
    embeddings: number[];
    pageNumber?: number;
    section?: string;
    startIndex: number;
    endIndex: number;
  }): Promise<string> {
    const query = `
      INSERT INTO document_chunks (document_id, content, embeddings, page_number, section, start_index, end_index)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    
    const result = await this.query(query, [
      chunk.documentId,
      chunk.content,
      chunk.embeddings,
      chunk.pageNumber,
      chunk.section,
      chunk.startIndex,
      chunk.endIndex,
    ]);
    
    return result.rows[0].id;
  }

  async searchDocuments(query: string, limit: number = 10): Promise<any[]> {
    // Простой текстовый поиск (в будущем можно добавить векторный поиск)
    const sqlQuery = `
      SELECT d.id, d.title, d.metadata, dc.content, dc.page_number, dc.section
      FROM documents d
      JOIN document_chunks dc ON d.id = dc.document_id
      WHERE d.content ILIKE $1 OR dc.content ILIKE $1
      ORDER BY d.updated_at DESC
      LIMIT $2
    `;
    
    const result = await this.query(sqlQuery, [`%${query}%`, limit]);
    return result.rows;
  }
}
