import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

user = os.getenv("POSTGRES_USER", "postgres")
password = os.getenv("POSTGRES_PASSWORD", "azharzia")
host = os.getenv("POSTGRES_HOST", "localhost")
port = os.getenv("POSTGRES_PORT", "5432")

try:
    conn = psycopg2.connect(dbname="postgres", user=user, password=password, host=host, port=port)
    cursor = conn.cursor()
    cursor.execute("SELECT datname FROM pg_database;")
    databases = cursor.fetchall()
    print("Databases in PostgreSQL:")
    for db in databases:
        print(f"- {db[0]}")
    cursor.close()
    conn.close()
except Exception as e:
    print("Error listing databases:", e)
