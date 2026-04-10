from app.database.database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        conn.execute(text('ALTER TABLE students ADD COLUMN department VARCHAR;'))
        conn.commit()
    print("Column 'department' added successfully!")
except Exception as e:
    print("Error adding column:", e)
