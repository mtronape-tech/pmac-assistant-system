#!/usr/bin/env python3
"""
PDF to TXT Converter with formatting preservation
Конвертер PDF в TXT с сохранением разметки
"""

import fitz  # PyMuPDF
import sys
import os
from pathlib import Path

def convert_pdf_to_txt(pdf_path, output_path=None):
    """
    Конвертирует PDF файл в TXT с сохранением разметки
    
    Args:
        pdf_path (str): Путь к PDF файлу
        output_path (str, optional): Путь для сохранения TXT файла
    
    Returns:
        str: Путь к созданному TXT файлу
    """
    try:
        # Открываем PDF документ
        doc = fitz.open(pdf_path)
        
        # Если путь вывода не указан, создаем его на основе имени PDF
        if output_path is None:
            pdf_name = Path(pdf_path).stem
            output_path = f"{pdf_name}.txt"
        
        # Извлекаем текст со всех страниц
        full_text = ""
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Добавляем заголовок страницы
            full_text += f"\n{'='*60}\n"
            full_text += f"СТРАНИЦА {page_num + 1}\n"
            full_text += f"{'='*60}\n\n"
            
            # Извлекаем текст с сохранением структуры
            text = page.get_text()
            full_text += text
            
            # Добавляем разделитель между страницами
            full_text += f"\n\n{'='*60}\n"
        
        # Сохраняем количество страниц до закрытия документа
        pages_count = len(doc)
        
        # Закрываем документ
        doc.close()
        
        # Сохраняем в файл
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(full_text)
        
        print(f"✅ Конвертация завершена!")
        print(f"📄 Исходный файл: {pdf_path}")
        print(f"📝 Результат сохранен в: {output_path}")
        print(f"📊 Обработано страниц: {pages_count}")
        
        return output_path
        
    except Exception as e:
        print(f"❌ Ошибка при конвертации: {str(e)}")
        return None

def main():
    """Основная функция"""
    if len(sys.argv) < 2:
        print("Использование: python pdf_to_txt_converter.py <путь_к_pdf_файлу> [путь_к_выходному_файлу]")
        print("Пример: python pdf_to_txt_converter.py document.pdf output.txt")
        return
    
    pdf_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Проверяем существование файла
    if not os.path.exists(pdf_path):
        print(f"❌ Файл не найден: {pdf_path}")
        return
    
    # Выполняем конвертацию
    convert_pdf_to_txt(pdf_path, output_path)

if __name__ == "__main__":
    main()