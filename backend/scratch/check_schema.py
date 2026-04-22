import os
from sqlalchemy import create_engine, text

def get_db_url():
    env_path = os.path.join("backend", ".env")
    config = {}
    with open(env_path, "r") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                parts = line.strip().split("=", 1)
                config[parts[0]] = parts[1]
    
    return f"postgresql://{config['POSTGRES_USER']}:{config['POSTGRES_PASSWORD']}@{config['POSTGRES_HOST']}:{config['POSTGRES_PORT']}/{config['POSTGRES_DB']}"

def check_table_schema():
    try:
        url = get_db_url()
        engine = create_engine(url)
        with engine.connect() as conn:
            # Check face_encodings columns
            result = conn.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'face_encodings'
            """)).fetchall()
            print("Table: face_encodings")
            for row in result:
                print(f"  Column: {row.column_name}, Type: {row.data_type}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_table_schema()
