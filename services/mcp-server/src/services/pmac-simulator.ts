import { logger } from "../utils/logger.js";
import { config } from "../config.js";

export class PMACSimulator {
  private variables: Map<string, number> = new Map();
  private coordinates: Map<string, number> = new Map();
  private status: string = "idle";
  private uptime: number = 0;
  private startTime: Date = new Date();

  constructor() {
    this.initializeSimulator();
    this.startSimulation();
  }

  private initializeSimulator(): void {
    // Инициализируем переменные PMAC случайными значениями
    for (const type of ["P", "Q", "I", "M", "L"]) {
      for (let addr = 1; addr <= 100; addr++) {
        const key = `${type}${addr}`;
        this.variables.set(key, Math.random() * 1000);
      }
    }

    // Инициализируем координаты
    const axes = ["x", "y", "z", "a", "b", "c"];
    for (const axis of axes) {
      this.coordinates.set(axis, Math.random() * 100);
    }

    logger.info("PMAC симулятор инициализирован");
  }

  private startSimulation(): void {
    // Запускаем симуляцию в фоновом режиме
    setInterval(() => {
      this.updateSimulation();
    }, 1000); // Обновляем каждую секунду
  }

  private updateSimulation(): void {
    // Обновляем время работы
    this.uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);

    // Симулируем изменение координат (движение)
    if (this.status === "running") {
      const axes = ["x", "y", "z", "a", "b", "c"];
      for (const axis of axes) {
        const current = this.coordinates.get(axis) || 0;
        const change = (Math.random() - 0.5) * 2; // Случайное изменение ±1
        this.coordinates.set(axis, current + change);
      }
    }

    // Симулируем изменение некоторых переменных
    const variableTypes = ["P", "Q", "I", "M", "L"];
    for (const type of variableTypes) {
      for (let addr = 1; addr <= 10; addr++) {
        const key = `${type}${addr}`;
        const current = this.variables.get(key) || 0;
        const change = (Math.random() - 0.5) * 10; // Случайное изменение ±5
        this.variables.set(key, current + change);
      }
    }
  }

  async readVariable(type: string, address: number): Promise<number> {
    const key = `${type}${address}`;
    const value = this.variables.get(key);
    
    if (value === undefined) {
      throw new Error(`Переменная ${key} не найдена`);
    }

    // Симулируем задержку ответа
    await this.simulateDelay();
    
    logger.debug(`Симулятор: чтение ${key} = ${value}`);
    return value;
  }

  async writeVariable(type: string, address: number, value: number): Promise<void> {
    const key = `${type}${address}`;
    
    // Проверяем диапазон значений
    if (value < -10000 || value > 10000) {
      throw new Error(`Значение ${value} вне допустимого диапазона [-10000, 10000]`);
    }

    this.variables.set(key, value);
    
    // Симулируем задержку ответа
    await this.simulateDelay();
    
    logger.debug(`Симулятор: запись ${key} = ${value}`);
  }

  async getStatus(): Promise<any> {
    await this.simulateDelay();

    const axes: Record<string, any> = {};
    const axesList = ["x", "y", "z", "a", "b", "c"];
    
    for (const axis of axesList) {
      axes[axis] = {
        position: this.coordinates.get(axis) || 0,
        velocity: (Math.random() - 0.5) * 10,
        followingError: Math.random() * 0.1,
        status: "enabled",
        limits: {
          positive: Math.random() > 0.95,
          negative: Math.random() > 0.95,
        },
      };
    }

    const variables: Record<string, Record<number, number>> = {
      P: {},
      Q: {},
      I: {},
      M: {},
      L: {},
    };

    // Заполняем переменные
    for (const type of Object.keys(variables)) {
      for (let addr = 1; addr <= 10; addr++) {
        const key = `${type}${addr}`;
        const value = this.variables.get(key);
        if (value !== undefined) {
          variables[type][addr] = value;
        }
      }
    }

    return {
      controllerState: this.status,
      communicationStatus: "connected",
      coordinates: Object.fromEntries(this.coordinates),
      variables,
      axes,
      system: {
        temperature: 25 + Math.random() * 10,
        voltage: 24 + Math.random() * 2,
        errorCodes: this.generateErrorCodes(),
        uptime: this.uptime,
      },
    };
  }

  async executeCommand(command: string): Promise<string> {
    await this.simulateDelay();

    const cmd = command.toUpperCase().trim();
    
    switch (cmd) {
      case "START":
        this.status = "running";
        return "Контроллер запущен";
        
      case "STOP":
        this.status = "idle";
        return "Контроллер остановлен";
        
      case "RESET":
        this.status = "idle";
        this.uptime = 0;
        this.startTime = new Date();
        return "Контроллер сброшен";
        
      case "STATUS":
        return `Статус: ${this.status}, Время работы: ${this.uptime} сек`;
        
      case "HOME":
        this.status = "homing";
        setTimeout(() => {
          this.status = "idle";
          // Сбрасываем координаты в нулевые позиции
          const axes = ["x", "y", "z", "a", "b", "c"];
          for (const axis of axes) {
            this.coordinates.set(axis, 0);
          }
        }, 2000);
        return "Выполняется возврат в исходное положение";
        
      case "KILL":
      case "ABORT":
        this.status = "error";
        return "Аварийная остановка выполнена";
        
      default:
        // Симулируем выполнение неизвестной команды
        if (cmd.startsWith("P") || cmd.startsWith("Q") || cmd.startsWith("I") || cmd.startsWith("M") || cmd.startsWith("L")) {
          return `Команда ${command} выполнена`;
        }
        return `Неизвестная команда: ${command}`;
    }
  }

  private async simulateDelay(): Promise<void> {
    const delay = config.pmac.simulation.responseDelay;
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  private generateErrorCodes(): string[] {
    const errorCodes: string[] = [];
    const possibleErrors = [
      "E001", "E002", "E003", "E004", "E005",
      "W001", "W002", "W003", "W004", "W005"
    ];

    // С небольшой вероятностью генерируем ошибки
    for (const error of possibleErrors) {
      if (Math.random() < 0.05) { // 5% вероятность ошибки
        errorCodes.push(error);
      }
    }

    return errorCodes;
  }

  // Методы для тестирования
  setVariable(type: string, address: number, value: number): void {
    const key = `${type}${address}`;
    this.variables.set(key, value);
  }

  getVariable(type: string, address: number): number | undefined {
    const key = `${type}${address}`;
    return this.variables.get(key);
  }

  setCoordinate(axis: string, value: number): void {
    this.coordinates.set(axis, value);
  }

  getCoordinate(axis: string): number | undefined {
    return this.coordinates.get(axis);
  }

  setStatus(status: string): void {
    this.status = status;
  }

  getStatusString(): string {
    return this.status;
  }

  reset(): void {
    this.initializeSimulator();
    this.status = "idle";
    this.uptime = 0;
    this.startTime = new Date();
  }
}
