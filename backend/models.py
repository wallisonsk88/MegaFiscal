from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

class Invoice(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    number = db.Column(db.String(20), nullable=False)
    issue_date = db.Column(db.String(50)) # Keeping as string for simplicity first, ISO format
    sender_cnpj = db.Column(db.String(14))
    sender_name = db.Column(db.String(255))
    sender_uf = db.Column(db.String(2))
    total_value = db.Column(db.Float)
    
    # Taxes and Totals
    v_icms = db.Column(db.Float, default=0.0)
    icms_st_value = db.Column(db.Float, default=0.0) # Existing, renaming mentally to v_st
    v_ipi = db.Column(db.Float, default=0.0)
    v_pis = db.Column(db.Float, default=0.0)
    v_cofins = db.Column(db.Float, default=0.0)
    v_frete = db.Column(db.Float, default=0.0)
    v_seg = db.Column(db.Float, default=0.0)
    v_desc = db.Column(db.Float, default=0.0)
    v_outro = db.Column(db.Float, default=0.0)
    
    products = db.relationship('Product', backref='invoice', lazy=True)

class CompanyConfig(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    rbt12 = db.Column(db.Float, default=0.0) # Receita Bruta Total 12 meses
    annex = db.Column(db.String(20), default="Anexo I")
    last_updated = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoice.id'), nullable=False)
    code = db.Column(db.String(50))
    name = db.Column(db.String(255))
    ncm = db.Column(db.String(10))
    cest = db.Column(db.String(10))
    cfop = db.Column(db.String(5))
    quantity = db.Column(db.Float)
    unit_price = db.Column(db.Float)
    total_price = db.Column(db.Float)
    
    # Taxes
    v_icms = db.Column(db.Float, default=0.0)
    icms_st_value = db.Column(db.Float, default=0.0)
    v_ipi = db.Column(db.Float, default=0.0)
    v_pis = db.Column(db.Float, default=0.0)
    v_cofins = db.Column(db.Float, default=0.0)
    
    # Validation flags
    is_st = db.Column(db.Boolean, default=True) # Pharmacy items are ST by default in 2024/2025
    cest_mismatch = db.Column(db.Boolean, default=False)
    projected_tax = db.Column(db.Float, default=0.0)
    tax_alert = db.Column(db.String(255), nullable=True)
