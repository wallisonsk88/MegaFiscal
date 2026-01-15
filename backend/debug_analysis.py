from app import app, db, Product, Invoice
from sqlalchemy import func

with app.app_context():
    try:
        print("Starting analysis debug...")
        
        # Test Query 1
        print("Querying inconsistencies...")
        inconsistencies = Product.query.filter(
            (Product.tax_alert.isnot(None)) | 
            (Product.cest == '') | 
            (Product.cest.is_(None)) |
            (Product.projected_tax > 0)
        ).all()
        print(f"Found {len(inconsistencies)} items")

        # Test Query 2
        print("Summarizing projected tax...")
        total_projected = db.session.query(func.sum(Product.projected_tax)).scalar() or 0.0
        print(f"Total projected: {total_projected}")

        # Test Data Construction
        print("Building data list...")
        analysis_data = []
        for p in inconsistencies:
            print(f"Processing product ID: {p.id}")
            # The next line might crash if p.invoice is None
            if p.invoice is None:
                print(f"WARNING: Product {p.id} has no linked invoice!")
                continue
            
            analysis_data.append({
                'id': p.id,
                'invoice_number': p.invoice.number,
                'issuer': p.invoice.sender_name,
                'product_name': p.name,
                'ncm': p.ncm,
                'cest': p.cest or 'NÃO INFORMADO',
                'alert': p.tax_alert or ('CEST Ausente' if not p.cest else 'Alerta Fiscal'),
                'value': p.total_price,
                'projected_tax': p.projected_tax
            })
        print(f"Successfully built {len(analysis_data)} items")

    except Exception as e:
        import traceback
        traceback.print_exc()
