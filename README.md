- Включить виртуальное окружение
ввести в терминале: python -m venv venv
с Mac OS: python3 -m venv venv
# → это надо сделать только в первый раз

- Активируем виртуальное окружение
.\venv\Scripts\Activate
с Mac OS: source venv/bin/activate
# → должно появиться (venv) в начале строки

- Скачать библиотеки 
pip install -r requirements.txt
# → это надо сделать только в первый раз

- Запуск сервера
uvicorn main:app --reload
