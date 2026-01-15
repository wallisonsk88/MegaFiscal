import xmltodict

def parse_nfe_xml(xml_content):
    """
    Parses a NFe XML content and returns a dictionary with relevant data.
    """
    try:
        data = xmltodict.parse(xml_content)
        
        # Correctly navigate the XML structure for NFe
        # Typically: nfeProc -> NFe -> infNFe
        if 'nfeProc' in data:
            inf_nfe = data['nfeProc']['NFe']['infNFe']
        elif 'NFe' in data:
            inf_nfe = data['NFe']['infNFe']
        else:
            raise ValueError("Invalid NFe XML structure")

        # Basic Info
        ide = inf_nfe['ide']
        emit = inf_nfe['emit']
        dest = inf_nfe.get('dest', {})
        total = inf_nfe['total']['ICMSTot']
        
        # Products
        det = inf_nfe['det']
        if not isinstance(det, list):
            det = [det]
            
        products = []
        for item in det:
            prod = item['prod']
            imposto = item['imposto']
            
            # Extract ICMS data
            icms = imposto.get('ICMS', {})
            icms_val = {}
            for key in icms.keys():
                if key.startswith('ICMS'):
                    icms_val = icms[key]
                    break
            
            # Extract IPI data
            ipi = imposto.get('IPI', {})
            ipi_val = {}
            if 'IPITrib' in ipi:
                ipi_val = ipi['IPITrib']
            
            # Extract PIS data
            pis = imposto.get('PIS', {})
            pis_val = {}
            for key in pis.keys():
                if key.startswith('PIS'):
                    pis_val = pis[key]
                    break
            
            # Extract COFINS data
            cofins = imposto.get('COFINS', {})
            cofins_val = {}
            for key in cofins.keys():
                if key.startswith('COFINS'):
                    cofins_val = cofins[key]
                    break
            
            products.append({
                'code': prod.get('cProd'),
                'name': prod.get('xProd'),
                'ncm': prod.get('NCM'),
                'cest': prod.get('CEST'),
                'cfop': prod.get('CFOP'),
                'uCom': prod.get('uCom'),
                'quantity': prod.get('qCom'),
                'unit_price': prod.get('vUnCom'),
                'total_price': prod.get('vProd'),
                # Taxes
                'v_icms': icms_val.get('vICMS', '0.00'),
                'icms_st_value': icms_val.get('vICMSST', '0.00'),
                'v_ipi': ipi_val.get('vIPI', '0.00'),
                'v_pis': pis_val.get('vPIS', '0.00'),
                'v_cofins': cofins_val.get('vCOFINS', '0.00'),
            })

        parsed_data = {
            'nNF': ide.get('nNF'),
            'dhEmi': ide.get('dhEmi'),
            'emitente': {
                'CNPJ': emit.get('CNPJ'),
                'xNome': emit.get('xNome'),
                'UF': emit['enderEmit'].get('UF')
            },
            'valor_total': total.get('vNF'),
            'valor_produtos': total.get('vProd'), 
            # Totals
            'v_icms': total.get('vICMS', '0.00'),
            'valor_icms_st': total.get('vST', '0.00'),
            'v_ipi': total.get('vIPI', '0.00'),
            'v_pis': total.get('vPIS', '0.00'),
            'v_cofins': total.get('vCOFINS', '0.00'),
            'v_frete': total.get('vFrete', '0.00'),
            'v_seg': total.get('vSeg', '0.00'),
            'v_desc': total.get('vDesc', '0.00'),
            'v_outro': total.get('vOutro', '0.00'),
            'products': products
        }
        
        return parsed_data

    except Exception as e:
        print(f"Error parsing XML: {e}")
        return None
