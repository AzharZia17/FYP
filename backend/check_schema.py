from app.database.database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
columns = [c['name'] for c in inspector.get_columns('students')]
print("STUDENT COLUMNS:", columns)
