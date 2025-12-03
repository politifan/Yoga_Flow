- Включить виртуальное окружение
ввести в терминале: python -m venv venv

- Активируем виртуальное окружение
.\venv\Scripts\Activate
# → должно появиться (venv) в начале строки

- Скачать библиотеки 
pip install -r requirements.txt

- Запуск сервера
uvicorn main:app --reload