from app import app, db
from sqlalchemy import text, inspect

with app.app_context():
    inspector = inspect(db.engine)
    columns = [c['name'] for c in inspector.get_columns('product')]
    
    # Add is_st if missing
    if 'is_st' not in columns:
        print("Adding is_st column to product table...")
        with db.engine.connect() as conn:
            conn.execute(text("ALTER TABLE product ADD COLUMN is_st BOOLEAN DEFAULT 1"))
            conn.commit()
    
    # Create company_config if missing
    if 'company_config' not in inspector.get_table_names():
        print("Creating company_config table...")
        db.create_all()
    
    print("Database sync complete.")
