from app.database.database import engine
from sqlalchemy import inspect
try:
    inspector = inspect(engine)
    with open('tables.txt', 'w') as f:
        f.write(", ".join(inspector.get_table_names()))
except Exception as e:
    with open('error.txt', 'w') as f:
        import traceback
        f.write(traceback.format_exc())
