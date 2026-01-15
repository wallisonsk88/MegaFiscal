from app import app, db, Invoice, Product

with app.app_context():
    try:
        count = Invoice.query.count()
        print(f"Total invoices: {count}")
        invoices = Invoice.query.limit(5).all()
        for inv in invoices:
            print(f"Invoice {inv.number}: {inv.total_value}")
    except Exception as e:
        print(f"Error: {e}")
