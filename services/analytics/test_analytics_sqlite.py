#!/usr/bin/env python3
"""
Тест Analytics Service с SQLite
Простой тест без Docker и PostgreSQL
"""

import requests
import time
import json
from datetime import datetime, timedelta

def test_analytics_service():
    """Тестируем сервис аналитики"""
    
    base_url = "http://localhost:3003"
    
    print("🧪 Тестирование Analytics Service (SQLite)")
    print("=" * 50)
    
    # Ждем запуска сервиса
    print("⏳ Ожидание запуска сервиса...")
    for attempt in range(30):
        try:
            response = requests.get(f"{base_url}/health", timeout=5)
            if response.status_code == 200:
                print("✅ Сервис запущен!")
                break
        except requests.exceptions.RequestException:
            if attempt < 29:
                print(f"   Попытка {attempt + 1}/30...")
                time.sleep(1)
            else:
                print("❌ Сервис не запустился за 30 секунд")
                return False
    
    # Тест 1: Проверка здоровья
    print("\n📊 Тест 1: Проверка здоровья сервиса")
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Статус: {data.get('status')}")
            print(f"   📊 База данных: {data.get('database')}")
            print(f"   🕐 Время: {data.get('timestamp')}")
        else:
            print(f"   ❌ Ошибка: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Ошибка: {e}")
        return False
    
    # Тест 2: Список машин
    print("\n🏭 Тест 2: Получение списка машин")
    try:
        response = requests.get(f"{base_url}/api/analytics/machines")
        if response.status_code == 200:
            data = response.json()
            machines = data.get('machines', [])
            print(f"   ✅ Найдено машин: {len(machines)}")
            for machine in machines:
                print(f"      - {machine}")
        else:
            print(f"   ❌ Ошибка: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Ошибка: {e}")
        return False
    
    # Тест 3: Статистика для машины
    print("\n📈 Тест 3: Статистика для машины")
    try:
        machine_id = "PMAC_001"
        response = requests.get(f"{base_url}/api/analytics/statistics/{machine_id}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Машина: {data.get('machine_id')}")
            print(f"   📊 Точки данных: {data.get('data_points')}")
            stats = data.get('statistics', {})
            print(f"   📊 Среднее: {stats.get('mean')}")
            print(f"   📊 Мин/Макс: {stats.get('min')}/{stats.get('max')}")
        else:
            print(f"   ❌ Ошибка: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Ошибка: {e}")
        return False
    
    # Тест 4: Анализ трендов
    print("\n📊 Тест 4: Анализ трендов")
    try:
        machine_id = "PMAC_001"
        response = requests.get(f"{base_url}/api/analytics/trends/{machine_id}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Машина: {data.get('machine_id')}")
            print(f"   📈 Тренд: {data.get('trend')}")
            print(f"   💪 Сила тренда: {data.get('trend_strength')}")
        else:
            print(f"   ❌ Ошибка: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Ошибка: {e}")
        return False
    
    # Тест 5: Корреляционный анализ
    print("\n🔗 Тест 5: Корреляционный анализ")
    try:
        machine_id = "PMAC_001"
        response = requests.get(f"{base_url}/api/analytics/correlation/{machine_id}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Машина: {data.get('machine_id')}")
            correlations = data.get('correlations', {})
            print(f"   🔗 Найдено корреляций: {len(correlations)}")
            for key, value in list(correlations.items())[:3]:  # Показываем первые 3
                print(f"      - {key}: {value}")
        else:
            print(f"   ❌ Ошибка: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Ошибка: {e}")
        return False
    
    # Тест 6: Данные для графиков
    print("\n📊 Тест 6: Данные для графиков")
    try:
        machine_id = "PMAC_001"
        response = requests.get(f"{base_url}/api/analytics/charts/time-series/{machine_id}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Машина: {data.get('machine_id')}")
            print(f"   📊 Тип графика: {data.get('chart_type')}")
            chart_data = data.get('data', {})
            print(f"   📈 Переменных: {len(chart_data)}")
            for var_name, var_data in list(chart_data.items())[:2]:  # Показываем первые 2
                points = len(var_data.get('values', []))
                print(f"      - {var_name}: {points} точек")
        else:
            print(f"   ❌ Ошибка: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Ошибка: {e}")
        return False
    
    print("\n🎉 Все тесты пройдены успешно!")
    return True

def test_api_documentation():
    """Тестируем API документацию"""
    print("\n📚 Тест API документации")
    print("=" * 30)
    
    base_url = "http://localhost:3003"
    
    try:
        # Проверяем Swagger UI
        response = requests.get(f"{base_url}/docs")
        if response.status_code == 200:
            print("✅ Swagger UI доступен")
        else:
            print(f"❌ Swagger UI недоступен: {response.status_code}")
        
        # Проверяем ReDoc
        response = requests.get(f"{base_url}/redoc")
        if response.status_code == 200:
            print("✅ ReDoc доступен")
        else:
            print(f"❌ ReDoc недоступен: {response.status_code}")
        
        # Проверяем OpenAPI schema
        response = requests.get(f"{base_url}/openapi.json")
        if response.status_code == 200:
            schema = response.json()
            print(f"✅ OpenAPI schema доступен (версия: {schema.get('info', {}).get('version', 'N/A')})")
        else:
            print(f"❌ OpenAPI schema недоступен: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Ошибка при проверке документации: {e}")

if __name__ == "__main__":
    print("🚀 Запуск тестов Analytics Service")
    print("Убедитесь, что сервис запущен: python simple_analytics_service.py")
    print()
    
    success = test_analytics_service()
    
    if success:
        test_api_documentation()
        print("\n🎯 Рекомендации:")
        print("   - Откройте http://localhost:3003/docs для интерактивного тестирования")
        print("   - Используйте http://localhost:3003/redoc для чтения документации")
        print("   - Все данные сохраняются в SQLite файл analytics.db")
    else:
        print("\n❌ Тесты не пройдены. Проверьте:")
        print("   - Запущен ли сервис: python simple_analytics_service.py")
        print("   - Доступен ли порт 3003")
        print("   - Нет ли ошибок в логах сервиса")
