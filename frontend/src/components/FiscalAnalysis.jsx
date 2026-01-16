import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle2, Info, ArrowRight, Search } from 'lucide-react';
import { cn } from '../lib/utils';

export function FiscalAnalysis() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);

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
    }, []);

    if (loading) {
        return <div className="p-10 text-center text-gray-500 font-medium">Analisando dados fiscais...</div>;
    }

    if (!data) {
        return <div className="p-10 text-center text-red-500 font-medium font-medium">Erro ao carregar análise.</div>;
    }

    return (
        <div className="space-y-6">
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
                    <span className="text-xs font-bold text-red-600 uppercase">Imposto Total Projetado</span>
                    <span className="text-2xl font-black text-red-700">
                        R$ {data.total_projected_tax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-red-500 mt-1">* Estimativa de ST/DIFAL a recolher</span>
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
                                            {item.v_icms > 0 && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded">
                                                    ICMS: R${item.v_icms.toFixed(2)}
                                                </span>
                                            )}
                                            {item.v_st > 0 && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-600 border border-purple-100 rounded">
                                                    ST: R${item.v_st.toFixed(2)}
                                                </span>
                                            )}
                                            {item.v_ipi > 0 && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-100 rounded">
                                                    IPI: R${item.v_ipi.toFixed(2)}
                                                </span>
                                            )}
                                            {item.v_pis > 0 && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-50 text-teal-600 border border-teal-100 rounded">
                                                    PIS: R${item.v_pis.toFixed(2)}
                                                </span>
                                            )}
                                            {item.v_cofins > 0 && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded">
                                                    COFINS: R${item.v_cofins.toFixed(2)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end text-sm">
                                            <span className="text-gray-500 font-medium tracking-tight">Valor: R$ {item.value.toFixed(2)}</span>
                                            {item.projected_tax > 0 && (
                                                <span className="font-bold text-red-600">
                                                    Projeção ST/DIFAL: R$ {item.projected_tax.toFixed(2)}
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
