from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import logging
import traceback
from models import db, Invoice, Product
from services.xml_parser import parse_nfe_xml
from sqlalchemy import select, func, or_

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Precise CORS configuration
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.after_request
def after_request(response):
    # Ensure headers for local and hybrid environments
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.errorhandler(Exception)
def handle_exception(e):
    logger.error(f"Unhandled Exception: {str(e)}")
    logger.error(traceback.format_exc())
    return jsonify({
        "error": str(e),
        "traceback": traceback.format_exc() if not os.environ.get("PRODUCTION") else "Internal Server Error"
    }), 500

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
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize DB
db.init_app(app)

with app.app_context():
    try:
        db.create_all()
    except Exception as e:
        logger.error(f"Database creation failed: {e}")

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "Fiscal Control Backend", "vercel": IS_VERCEL})

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    try:
        total_invoices = db.session.execute(select(func.count(Invoice.id))).scalar() or 0
        total_value = db.session.execute(select(func.sum(Invoice.total_value))).scalar() or 0.0
        total_icms_st = db.session.execute(select(func.sum(Invoice.icms_st_value))).scalar() or 0.0
        
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
            invoice_num = p.invoice.number if p.invoice else "N/A"
            issuer_name = p.invoice.sender_name if p.invoice else "N/A"

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

@app.route('/api/search-cest', methods=['POST'])
def search_missing_cest():
    try:
        NCM_CEST_MAP = {
            "3004": "1300200", "3003": "1300200", "30049099": "1300200",
            "3304": "2001900", "330499": "2001900", "3305": "2000500",
            "33051000": "2000300", "34011190": "2000200", "3306": "2001100",
            "33072000": "2001400", "21069030": "1709600", "9018": "1301000",
        }

        stmt = select(Product).where(or_(Product.cest == '', Product.cest.is_(None)))
        products_missing = db.session.execute(stmt).scalars().all()
        
        updated_count = 0
        updates = []

        for p in products_missing:
            ncm_clean = (p.ncm or "").replace(".", "").replace("-", "").strip()
            if not ncm_clean: continue

            found_cest = None
            if ncm_clean in NCM_CEST_MAP:
                found_cest = NCM_CEST_MAP[ncm_clean]
            elif len(ncm_clean) >= 6 and ncm_clean[:6] in NCM_CEST_MAP:
                found_cest = NCM_CEST_MAP[ncm_clean[:6]]
            elif len(ncm_clean) >= 4 and ncm_clean[:4] in NCM_CEST_MAP:
                found_cest = NCM_CEST_MAP[ncm_clean[:4]]

            if found_cest:
                p.cest = found_cest
                if p.tax_alert:
                    new_alert = p.tax_alert.replace(" | CEST não informado", "").replace("CEST não informado", "").strip()
                    p.tax_alert = new_alert if new_alert else None
                updated_count += 1
                updates.append({"id": p.id, "product": p.name, "ncm": p.ncm, "cest": p.cest})

        if updated_count > 0:
            db.session.commit()

        return jsonify({"success": True, "updated_count": updated_count, "items_updated": updates})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Search CEST error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/invoices/<int:id>', methods=['DELETE'])
def delete_invoice(id):
    try:
        invoice = db.session.get(Invoice, id)
        if not invoice: return jsonify({"error": "Invoice not found"}), 404
        db.session.execute(db.delete(Product).where(Product.invoice_id == id))
        db.session.delete(invoice)
        db.session.commit()
        return jsonify({"message": "Invoice deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_xml():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        files = request.files.getlist('file')
        processed_files = []
        
        for file in files:
            if file.filename == '' or not file.filename.endswith('.xml'):
                continue
                
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            file.save(filepath)
            
            try:
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                except UnicodeDecodeError:
                    with open(filepath, 'r', encoding='latin-1') as f:
                        content = f.read()
                        
                data = parse_nfe_xml(content)
                if data:
                    invoice = Invoice(
                        number=data['nNF'],
                        issue_date=data['dhEmi'],
                        sender_cnpj=data['emitente']['CNPJ'],
                        sender_name=data['emitente']['xNome'],
                        sender_uf=data['emitente']['UF'],
                        total_value=float(data['valor_total'] or 0),
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
                    db.session.commit()
                    
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
                            v_icms=float(prod_data['v_icms'] or 0),
                            icms_st_value=float(prod_data['icms_st_value'] or 0),
                            v_ipi=float(prod_data['v_ipi'] or 0),
                            v_pis=float(prod_data['v_pis'] or 0),
                            v_cofins=float(prod_data['v_cofins'] or 0),
                        )
                        
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
                logger.error(f"Error processing file {file.filename}: {traceback.format_exc()}")
                db.session.rollback()

        return jsonify({"message": f"Processed {len(processed_files)} files", "files": processed_files}), 201
    except Exception as e:
        logger.error(f"Upload Route Error: {traceback.format_exc()}")
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001, use_reloader=False)
