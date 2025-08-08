@echo off
echo Установка зависимостей...
pip install -r requirements.txt

echo.
echo Конвертация PDF в TXT...
python pdf_to_txt_converter.py "Turbo PMAC Software Reference Manual.pdf"

echo.
echo Готово! Нажмите любую клавишу для выхода...
pause