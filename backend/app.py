from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from models import db, Invoice, Product
from services.xml_parser import parse_nfe_xml

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Configuration
IS_VERCEL = "VERCEL" in os.environ

if IS_VERCEL:
    app.config['UPLOAD_FOLDER'] = '/tmp/uploads'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////tmp/fiscal_control.db'
else:
    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///fiscal_control.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Ensure folders exist
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# Initialize DB
db.init_app(app)

with app.app_context():
    db.create_all()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "Fiscal Control Backend"})

from sqlalchemy import select, func, or_, delete, update

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    try:
        # Totals
        total_invoices = db.session.execute(select(func.count(Invoice.id))).scalar() or 0
        total_value = db.session.execute(select(func.sum(Invoice.total_value))).scalar() or 0.0
        total_icms_st = db.session.execute(select(func.sum(Invoice.icms_st_value))).scalar() or 0.0
        
        # Recent Invoices
        stmt = select(Invoice).order_by(Invoice.id.desc()).limit(10)
        recent_invoices = db.session.execute(stmt).scalars().all()
        
        invoices_data = []
        for inv in recent_invoices:
            invoices_data.append({
                'id': inv.id,
                'number': inv.number,
                'issuer': inv.sender_name,
                'date': inv.issue_date,
                'value': inv.total_value or 0.0,
                'st_value': inv.icms_st_value or 0.0,
                'items_count': len(inv.products) if inv.products else 0
            })

        return jsonify({
            'summary': {
                'total_invoices': total_invoices,
                'total_value': total_value,
                'total_icms_st': total_icms_st
            },
            'recent_invoices': invoices_data
        })
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/analysis', methods=['GET'])
def get_analysis_data():
    try:
        # Find products with tax alerts or potentially wrong CEST
        stmt = select(Product).where(
            or_(
                Product.tax_alert.isnot(None),
                Product.cest == '',
                Product.cest.is_(None),
                Product.projected_tax > 0
            )
        )
        inconsistencies = db.session.execute(stmt).scalars().all()
        
        total_projected = db.session.execute(select(func.sum(Product.projected_tax))).scalar() or 0.0
        
        analysis_data = []
        for p in inconsistencies:
            # Defensive check for relationship
            invoice_num = "N/A"
            issuer_name = "N/A"
            if p.invoice:
                invoice_num = p.invoice.number
                issuer_name = p.invoice.sender_name

            analysis_data.append({
                'id': p.id,
                'invoice_number': invoice_num,
                'issuer': issuer_name,
                'product_name': p.name,
                'ncm': p.ncm,
                'cest': p.cest or 'NÃO INFORMADO',
                'alert': p.tax_alert or ('CEST Ausente' if not p.cest else 'Alerta Fiscal'),
                'value': p.total_price or 0.0,
                'v_icms': p.v_icms or 0.0,
                'v_st': p.icms_st_value or 0.0,
                'v_ipi': p.v_ipi or 0.0,
                'v_pis': p.v_pis or 0.0,
                'v_cofins': p.v_cofins or 0.0,
                'projected_tax': p.projected_tax or 0.0
            })

        return jsonify({
            'inconsistencies_count': len(analysis_data),
            'total_projected_tax': total_projected,
            'items': analysis_data
        })
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/invoices/<int:id>', methods=['DELETE'])
def delete_invoice(id):
    try:
        invoice = db.session.get(Invoice, id)
        if not invoice:
            return jsonify({"error": "Invoice not found"}), 404
        
        # Delete associated products
        db.session.execute(db.delete(Product).where(Product.invoice_id == id))
        db.session.delete(invoice)
        db.session.commit()
        
        return jsonify({"message": "Invoice deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_xml():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    files = request.files.getlist('file')
    processed_files = []
    
    for file in files:
        if file.filename == '':
            continue
            
        if file and file.filename.endswith('.xml'):
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
            file.save(filepath)
            
            # Read and Parse with encoding detection
            try:
                # Try UTF-8 first, fallback to latin-1
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                except UnicodeDecodeError:
                    with open(filepath, 'r', encoding='latin-1') as f:
                        content = f.read()
                        
                data = parse_nfe_xml(content)
                
                if data:
                    # Save to DB
                    invoice = Invoice(
                        number=data['nNF'],
                        issue_date=data['dhEmi'],
                        sender_cnpj=data['emitente']['CNPJ'],
                        sender_name=data['emitente']['xNome'],
                        sender_uf=data['emitente']['UF'],
                        total_value=float(data['valor_total'] or 0),
                        # New tax fields
                        v_icms=float(data['v_icms'] or 0),
                        icms_st_value=float(data['valor_icms_st'] or 0),
                        v_ipi=float(data['v_ipi'] or 0),
                        v_pis=float(data['v_pis'] or 0),
                        v_cofins=float(data['v_cofins'] or 0),
                        v_frete=float(data['v_frete'] or 0),
                        v_seg=float(data['v_seg'] or 0),
                        v_desc=float(data['v_desc'] or 0),
                        v_outro=float(data['v_outro'] or 0)
                    )
                    db.session.add(invoice)
                    db.session.commit() # Commit to get ID
                    
                    for prod_data in data['products']:
                        product = Product(
                            invoice_id=invoice.id,
                            code=prod_data['code'],
                            name=prod_data['name'],
                            ncm=prod_data['ncm'],
                            cest=prod_data['cest'],
                            cfop=prod_data['cfop'],
                            quantity=float(prod_data['quantity'] or 0),
                            unit_price=float(prod_data['unit_price'] or 0),
                            total_price=float(prod_data['total_price'] or 0),
                            # Taxes
                            v_icms=float(prod_data['v_icms'] or 0),
                            icms_st_value=float(prod_data['icms_st_value'] or 0),
                            v_ipi=float(prod_data['v_ipi'] or 0),
                            v_pis=float(prod_data['v_pis'] or 0),
                            v_cofins=float(prod_data['v_cofins'] or 0),
                        )
                        
                        # Tax Logic Enhancement
                        if data['emitente']['UF'] != 'SP': 
                             if float(prod_data['icms_st_value'] or 0) == 0:
                                 product.projected_tax = product.total_price * 0.12
                                 product.tax_alert = "Imposto a recolher (Compra Interestadual sem ST)"
                             else:
                                 product.tax_alert = "ST já recolhida na origem"
                        
                        if not product.cest:
                            product.tax_alert = (product.tax_alert or "") + " | CEST não informado"

                        db.session.add(product)
                    
                    db.session.commit()
                    processed_files.append(file.filename)
            except Exception as e:
                app.logger.error(f"Error processing file {file.filename}: {e}")
                db.session.rollback()

    return jsonify({"message": f"Processed {len(processed_files)} files", "files": processed_files}), 201

if __name__ == '__main__':
    # Using use_reloader=False to prevent connection resets on Windows during DB/File writes
    # Binding to 0.0.0.0 to ensure accessibility
    app.run(debug=True, host='0.0.0.0', port=5001, use_reloader=False)
