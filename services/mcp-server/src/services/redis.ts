import { createClient, RedisClientType } from "redis";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

export class RedisService {
  private client: RedisClientType | null = null;

  async connect(): Promise<void> {
    try {
      this.client = createClient({
        url: config.redis.url,
      });

      this.client.on("error", (err) => {
        logger.error("Ошибка Redis:", err);
      });

      this.client.on("connect", () => {
        logger.info("Подключение к Redis установлено");
      });

      this.client.on("ready", () => {
        logger.info("Redis готов к работе");
      });

      this.client.on("end", () => {
        logger.info("Подключение к Redis закрыто");
      });

      await this.client.connect();
    } catch (error) {
      logger.error("Ошибка подключения к Redis:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      logger.info("Подключение к Redis закрыто");
    }
  }

  private getClient(): RedisClientType {
    if (!this.client) {
      throw new Error("Redis не подключен");
    }
    return this.client;
  }

  // Базовые операции
  async set(key: string, value: string, ttl?: number): Promise<void> {
    const client = this.getClient();
    if (ttl) {
      await client.setEx(key, ttl, value);
    } else {
      await client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.get(key);
  }

  async del(key: string): Promise<number> {
    const client = this.getClient();
    return await client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const client = this.getClient();
    const result = await client.exists(key);
    return result === 1;
  }

  // Операции с JSON
  async setJson(key: string, value: any, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error("Ошибка парсинга JSON из Redis:", error);
      return null;
    }
  }

  // Операции с хешами
  async hset(key: string, field: string, value: string): Promise<number> {
    const client = this.getClient();
    return await client.hSet(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    const client = this.getClient();
    return await client.hGet(key, field) || null;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const client = this.getClient();
    return await client.hGetAll(key);
  }

  async hdel(key: string, field: string): Promise<number> {
    const client = this.getClient();
    return await client.hDel(key, field);
  }

  // Операции со списками
  async lpush(key: string, value: string): Promise<number> {
    const client = this.getClient();
    return await client.lPush(key, value);
  }

  async rpush(key: string, value: string): Promise<number> {
    const client = this.getClient();
    return await client.rPush(key, value);
  }

  async lpop(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.lPop(key);
  }

  async rpop(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.rPop(key);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const client = this.getClient();
    return await client.lRange(key, start, stop);
  }

  // Операции с множествами
  async sadd(key: string, member: string): Promise<number> {
    const client = this.getClient();
    return await client.sAdd(key, member);
  }

  async srem(key: string, member: string): Promise<number> {
    const client = this.getClient();
    return await client.sRem(key, member);
  }

  async smembers(key: string): Promise<string[]> {
    const client = this.getClient();
    return await client.sMembers(key);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    const client = this.getClient();
    return await client.sIsMember(key, member);
  }

  // Операции с отсортированными множествами
  async zadd(key: string, score: number, member: string): Promise<number> {
    const client = this.getClient();
    return await client.zAdd(key, { score, value: member });
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    const client = this.getClient();
    return await client.zRange(key, start, stop);
  }

  async zrangebyscore(key: string, min: number, max: number): Promise<string[]> {
    const client = this.getClient();
    return await client.zRangeByScore(key, min, max);
  }

  // Кэширование для MCP
  async cacheMCPResponse(cacheKey: string, response: any, ttl: number = 3600): Promise<void> {
    await this.setJson(`mcp:response:${cacheKey}`, response, ttl);
  }

  async getCachedMCPResponse(cacheKey: string): Promise<any | null> {
    return await this.getJson(`mcp:response:${cacheKey}`);
  }

  // Кэширование для PMAC данных
  async cachePMACData(machineId: string, data: any, ttl: number = 300): Promise<void> {
    await this.setJson(`pmac:data:${machineId}`, data, ttl);
  }

  async getCachedPMACData(machineId: string): Promise<any | null> {
    return await this.getJson(`pmac:data:${machineId}`);
  }

  // Кэширование для документов
  async cacheDocument(documentId: string, document: any, ttl: number = 3600): Promise<void> {
    await this.setJson(`doc:${documentId}`, document, ttl);
  }

  async getCachedDocument(documentId: string): Promise<any | null> {
    return await this.getJson(`doc:${documentId}`);
  }

  // Управление сессиями
  async setSession(sessionId: string, sessionData: any, ttl: number = 86400): Promise<void> {
    await this.setJson(`session:${sessionId}`, sessionData, ttl);
  }

  async getSession(sessionId: string): Promise<any | null> {
    return await this.getJson(`session:${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  // Rate limiting
  async incrementRateLimit(key: string, ttl: number = 60): Promise<number> {
    const client = this.getClient();
    const current = await client.incr(key);
    if (current === 1) {
      await client.expire(key, ttl);
    }
    return current;
  }

  async getRateLimit(key: string): Promise<number> {
    const client = this.getClient();
    const value = await client.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  // Pub/Sub для уведомлений
  async publish(channel: string, message: string): Promise<number> {
    const client = this.getClient();
    return await client.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const client = this.getClient();
    await client.subscribe(channel, callback);
  }

  async unsubscribe(channel: string): Promise<void> {
    const client = this.getClient();
    await client.unsubscribe(channel);
  }
}
