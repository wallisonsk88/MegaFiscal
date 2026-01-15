import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import axios from 'axios';
import { cn } from '../lib/utils';

export function UploadZone() {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null); // 'success', 'error'
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(Array.from(e.target.files));
            setUploadStatus(null);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFiles(Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.xml')));
            setUploadStatus(null);
        }
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setUploading(true);
        const formData = new FormData();
        files.forEach(file => {
            formData.append('file', file);
        });

        try {
            const response = await axios.post('http://localhost:5001/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            console.log(response.data);
            setUploadStatus('success');
            setFiles([]);
            // Maybe trigger a refresh of data in parent?
        } catch (error) {
            console.error("Upload error:", error);
            setUploadStatus('error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Importar Notas (XML)
            </h2>

            <div
                className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                    files.length > 0 ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary/50",
                    uploading && "opacity-50 cursor-not-allowed"
                )}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    multiple
                    accept=".xml"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />

                <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-gray-50 rounded-full">
                        <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="text-sm text-gray-600">
                        <span className="font-semibold text-primary">Clique para upload</span> ou arraste e solte
                    </div>
                    <p className="text-xs text-gray-400">Suporta arquivos .XML (NFe)</p>
                </div>
            </div>

            {files.length > 0 && (
                <div className="mt-6 space-y-3">
                    <div className="flex justify-between items-center text-sm font-medium text-gray-700">
                        <span>Arquivos Selecionados ({files.length})</span>
                        <button
                            onClick={() => setFiles([])}
                            className="text-red-500 hover:text-red-600 text-xs"
                        >
                            Limpar
                        </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                        {files.map((f, i) => (
                            <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded border border-gray-100">
                                <FileText className="w-4 h-4 text-gray-500" />
                                <span className="text-sm truncate flex-1">{f.name}</span>
                                <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(1)} KB</span>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className={cn(
                            "w-full mt-4 py-2.5 px-4 rounded-lg font-medium text-white transition-all shadow-sm",
                            uploading ? "bg-gray-400 cursor-wait" : "bg-primary hover:bg-primary/90 hover:shadow-md"
                        )}
                    >
                        {uploading ? 'Enviando...' : 'Processar Notas'}
                    </button>
                </div>
            )}

            {uploadStatus === 'success' && (
                <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 text-sm">
                    <CheckCircle className="w-5 h-5" />
                    Sucesso! As notas foram importadas e processadas.
                </div>
            )}

            {uploadStatus === 'error' && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle className="w-5 h-5" />
                    Erro ao enviar arquivos. Verifique se o backend está rodando.
                </div>
            )}
        </div>
    );
}
