import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle2, Info, ArrowRight, Search } from 'lucide-react';
import { cn } from '../lib/utils';

export function FiscalAnalysis() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [settings, setSettings] = useState({ rbt12: 180000, effective_rate: 0.04 });
    const [tempRbt12, setTempRbt12] = useState('180000');
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    const fetchAnalysis = async () => {
        try {
            const res = await axios.get('/api/analysis');
            setData(res.data);
        } catch (error) {
            console.error("Error fetching analysis:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/settings');
            setSettings(res.data);
            setTempRbt12(res.data.rbt12.toString());
        } catch (error) {
            console.error("Error fetching settings:", error);
        }
    };

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        try {
            await axios.post('/api/settings', { rbt12: parseFloat(tempRbt12) });
            await fetchSettings();
            await fetchAnalysis(); // Re-calculate analysis with new rate
            alert("Configurações atualizadas!");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Erro ao salvar configurações.");
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleSearchCest = async () => {
        setSearching(true);
        try {
            const res = await axios.post('/api/search-cest');
            if (res.data.success) {
                alert(`${res.data.updated_count} códigos CEST encontrados e atualizados!`);
                fetchAnalysis(); // Refresh data
            }
        } catch (error) {
            console.error("Error searching CEST:", error);
            alert("Erro ao buscar códigos CEST.");
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        fetchAnalysis();
        fetchSettings();
    }, []);

    if (loading) {
        return <div className="p-10 text-center text-gray-500 font-medium">Analisando dados fiscais...</div>;
    }

    if (!data) {
        return <div className="p-10 text-center text-red-500 font-medium font-medium">Erro ao carregar análise.</div>;
    }

    return (
        <div className="space-y-6">
            {/* Simples Nacional Config Card */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Info size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 text-sm">Configuração Simples Nacional</h4>
                        <p className="text-xs text-gray-500">Ajuste o faturamento para calcular a alíquota efetiva (Anexo I).</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Faturamento 12m (RBT12)</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-700">R$</span>
                            <input
                                type="number"
                                value={tempRbt12}
                                onChange={(e) => setTempRbt12(e.target.value)}
                                className="w-32 px-2 py-1 border border-gray-200 rounded text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    <div className="h-10 w-px bg-gray-100 mx-2" />

                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Alíquota Efetiva</span>
                        <span className="text-lg font-black text-primary">
                            {(settings.effective_rate * 100).toFixed(2)}%
                        </span>
                    </div>

                    <button
                        onClick={handleSaveSettings}
                        disabled={isSavingSettings}
                        className="ml-4 px-4 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                        {isSavingSettings ? 'Salvando...' : 'Atualizar Base'}
                    </button>
                </div>
            </div>
            {/* Status Summary & Tax Projection Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={cn(
                    "p-4 rounded-xl flex items-center gap-4 border md:col-span-2",
                    data.inconsistencies_count > 0
                        ? "bg-amber-50 border-amber-100 text-amber-800"
                        : "bg-green-50 border-green-100 text-green-800"
                )}>
                    <div className={cn(
                        "p-2 rounded-full",
                        data.inconsistencies_count > 0 ? "bg-amber-100" : "bg-green-100"
                    )}>
                        {data.inconsistencies_count > 0
                            ? <AlertCircle className="w-6 h-6 text-amber-600" />
                            : <CheckCircle2 className="w-6 h-6 text-green-600" />
                        }
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">
                            {data.inconsistencies_count > 0
                                ? `${data.inconsistencies_count} Pontos de Atenção`
                                : "Nenhuma inconsistência fiscal detectada"
                            }
                        </h3>
                        <p className="text-sm opacity-90">
                            {data.inconsistencies_count > 0
                                ? "Verifique os itens abaixo para evitar o pagamento de impostos indevidos."
                                : "Sua base de dados parece estar em conformidade."
                            }
                        </p>
                    </div>
                </div>

                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex flex-col justify-center">
                    <span className="text-xs font-bold text-red-600 uppercase">Custo Fiscal Total Estimado</span>
                    <span className="text-2xl font-black text-red-700">
                        R$ {data.total_projected_tax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <div className="mt-2 flex flex-col gap-1">
                        <div className="flex justify-between text-[10px] font-bold text-red-500/80">
                            <span>DIFAL/ST (COMPRAS):</span>
                            <span>R$ {data.total_purchase_related_tax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-red-500/80">
                            <span>PROJEÇÃO DAS (VENDAS):</span>
                            <span>R$ {data.total_sale_related_tax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Inconsistencies List */}
            {data.inconsistencies_count > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="text-lg font-semibold text-gray-800">Itens com Alerta</h3>
                        <button
                            onClick={handleSearchCest}
                            disabled={searching}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                searching
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-primary text-white hover:bg-primary/90 shadow-sm"
                            )}
                        >
                            {searching ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                    Buscando CEST...
                                </>
                            ) : (
                                <>
                                    <Search size={16} />
                                    Buscar CEST Faltantes
                                </>
                            )}
                        </button>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {data.items.map((item) => (
                            <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                                NCM: {item.ncm}
                                            </span>
                                            <span className={cn(
                                                "text-xs font-bold px-2 py-0.5 rounded",
                                                item.is_st ? "bg-amber-100 text-amber-600" : "bg-teal-100 text-teal-600"
                                            )}>
                                                {item.is_st ? "SUBST. TRIBUTÁRIA (ST)" : "TRIBUTADO INTEGRAL"}
                                            </span>
                                            <span className={cn(
                                                "text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1",
                                                item.cest === 'NÃO INFORMADO' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                                            )}>
                                                CEST: {item.cest}
                                                {item.cest === 'NÃO INFORMADO' && (
                                                    <a
                                                        href={`https://cosmos.bluesoft.com.br/ncms/${item.ncm.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="hover:text-red-800 underline decoration-dotted"
                                                        title="Pesquisar CEST no Bluesoft Cosmos"
                                                    >
                                                        <Search size={10} />
                                                    </a>
                                                )}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-gray-800 text-base">{item.product_name}</h4>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Nota #{item.invoice_number} • {item.issuer}
                                        </p>
                                    </div>

                                    <div className="flex items-start md:items-end flex-col gap-3">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100/50 text-amber-700 rounded-lg border border-amber-200">
                                            <AlertCircle size={16} />
                                            <span className="text-sm font-semibold">{item.alert}</span>
                                        </div>

                                        {/* Tax Breakdown Badges */}
                                        <div className="flex flex-wrap md:justify-end gap-1.5 max-w-xs">
                                            {item.is_st ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded flex items-center gap-1">
                                                    <CheckCircle2 size={10} /> Venda Isenta de ICMS (ST)
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded flex items-center gap-1">
                                                    <AlertCircle size={10} /> Venda Tributada: {(data.effective_rate * 100).toFixed(2)}%
                                                </span>
                                            )}
                                            {item.v_icms > 0 && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded">
                                                    ICMS NFe: R${item.v_icms.toFixed(2)}
                                                </span>
                                            )}
                                            {item.v_st > 0 && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-600 border border-purple-100 rounded">
                                                    ST NFe: R${item.v_st.toFixed(2)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end text-sm">
                                            <span className="text-gray-500 font-medium tracking-tight">Valor: R$ {item.value.toFixed(2)}</span>
                                            {item.projected_purchase_tax > 0 && (
                                                <span className="font-bold text-red-600">
                                                    DIFAL/ST Compra: R$ {item.projected_purchase_tax.toFixed(2)}
                                                </span>
                                            )}
                                            {item.projected_sale_tax > 0 && (
                                                <span className="font-bold text-primary">
                                                    DAS Estimado p/ Venda: R$ {item.projected_sale_tax.toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tax Education Block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Info size={20} />
                        </div>
                        <h3 className="font-bold text-gray-800">O que é CEST?</h3>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        O Código Especificador da Substituição Tributária (CEST) identifica mercadorias passíveis de substituição tributária. O preenchimento incorreto pode levar ao pagamento duplicado de ICMS.
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <TrendingUp size={20} />
                        </div>
                        <h3 className="font-bold text-gray-800">Projeção Fiscal</h3>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        Baseado nas notas de entrada de outros estados, o sistema identifica se houve o diferencial de alíquota ou se a mercadoria deveria ter chegado com ICMS-ST recolhido.
                    </p>
                </div>
            </div>
        </div>
    );
}

function TrendingUp(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
        </svg>
    )
}
