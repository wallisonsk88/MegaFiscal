import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { DollarSign, FileText, TrendingUp, AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

export function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchDashboard = async () => {
        try {
            const res = await axios.get('/api/dashboard');
            setData(res.data);
        } catch (error) {
            console.error("Error fetching dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Tem certeza que deseja excluir esta nota? Todos os produtos vinculados também serão removidos.")) {
            return;
        }

        try {
            await axios.delete(`/api/invoices/${id}`);
            fetchDashboard(); // Refresh data
        } catch (error) {
            console.error("Error deleting invoice:", error);
            alert("Erro ao excluir nota.");
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    if (loading) {
        return <div className="p-10 text-center text-gray-500">Carregando dados...</div>;
    }

    if (!data) {
        return <div className="p-10 text-center text-red-500">Erro ao carregar dados. Verifique o servidor.</div>;
    }

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard
                    title="Total de Compras"
                    value={`R$ ${data.summary.total_value.toFixed(2)}`}
                    icon={<DollarSign className="w-6 h-6 text-white" />}
                    color="bg-emerald-500"
                />
                <KpiCard
                    title="Total ICMS ST"
                    value={`R$ ${data.summary.total_icms_st.toFixed(2)}`}
                    icon={<TrendingUp className="w-6 h-6 text-white" />}
                    color="bg-blue-500"
                />
                <KpiCard
                    title="Notas Importadas"
                    value={data.summary.total_invoices}
                    icon={<FileText className="w-6 h-6 text-white" />}
                    color="bg-purple-500"
                />
            </div>

            {/* Recent Invoices Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">Notas Recentes</h3>
                    <button onClick={fetchDashboard} className="text-sm text-primary hover:underline">Atualizar</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="p-4 font-medium">Número</th>
                                <th className="p-4 font-medium">Fornecedor</th>
                                <th className="p-4 font-medium">Data Emissão</th>
                                <th className="p-4 font-medium text-center">Itens</th>
                                <th className="p-4 font-medium">Valor Total</th>
                                <th className="p-4 font-medium">ICMS ST</th>
                                <th className="p-4 font-medium text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.recent_invoices.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-400">
                                        Nenhuma nota importada ainda.
                                    </td>
                                </tr>
                            ) : (
                                data.recent_invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors text-sm text-gray-700">
                                        <td className="p-4 font-medium">#{inv.number}</td>
                                        <td className="p-4">{inv.issuer}</td>
                                        <td className="p-4 text-gray-500">{new Date(inv.date).toLocaleDateString()}</td>
                                        <td className="p-4 text-center">
                                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">
                                                {inv.items_count}
                                            </span>
                                        </td>
                                        <td className="p-4 font-medium text-gray-900">R$ {inv.value.toFixed(2)}</td>
                                        <td className="p-4 text-red-600 font-medium">R$ {inv.st_value.toFixed(2)}</td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handleDelete(inv.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                                                title="Excluir Nota"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ title, value, icon, color }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={cn("p-3 rounded-lg shadow-sm", color)}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500 mb-1 font-medium">{title}</p>
                <h4 className="text-2xl font-bold text-gray-800">{value}</h4>
            </div>
        </div>
    )
}
