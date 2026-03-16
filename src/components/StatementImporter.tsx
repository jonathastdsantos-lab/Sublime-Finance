import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Check, X, Loader2, AlertCircle, FileCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { GoogleGenAI, Type } from "@google/genai";
import { db, auth, logAudit } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface TransactionPreview {
  description: string;
  amount: number;
  type: 'entrada' | 'saida';
  category: string;
  date: string;
  payment_method: string;
  notes?: string;
}

interface StatementImporterProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function StatementImporter({ onClose, onSuccess }: StatementImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewTransactions, setPreviewTransactions] = useState<TransactionPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/x-ofx': ['.ofx'],
      'text/plain': ['.txt']
    },
    multiple: false
  });

  const processWithAI = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const text = await file.text();
      const apiKey = process.env.GEMINI_API_KEY || "";
      
      if (!apiKey) {
        throw new Error("Chave da API Gemini não configurada. Por favor, configure GEMINI_API_KEY no ambiente.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        Analise o seguinte extrato bancário (pode estar em formato CSV, OFX ou texto simples).
        Extraia todas as transações financeiras e retorne um array JSON de objetos.
        Cada objeto deve seguir este esquema rigorosamente:
        {
          "description": "Nome ou descrição da transação",
          "amount": número positivo (ex: 150.50),
          "type": "entrada" ou "saida",
          "category": uma das seguintes: "servico", "material", "aluguel", "luz", "emprestimo", "mercado", "retirada", "pix_recebido", "pix_enviado", "pagamento", "mei_das", "imposto", "outro",
          "date": "YYYY-MM-DD",
          "payment_method": uma das seguintes: "pix", "dinheiro", "cartao_debito", "cartao_credito", "transferencia", "boleto",
          "notes": "Qualquer detalhe extra relevante"
        }

        Extrato:
        ${text.substring(0, 10000)} // Limit to 10k chars for safety
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                type: { type: Type.STRING, enum: ["entrada", "saida"] },
                category: { type: Type.STRING },
                date: { type: Type.STRING },
                payment_method: { type: Type.STRING },
                notes: { type: Type.STRING }
              },
              required: ["description", "amount", "type", "category", "date", "payment_method"]
            }
          }
        }
      });

      let responseText = response.text || '[]';
      // Clean up response text in case AI added markdown blocks
      if (responseText.includes('```json')) {
        responseText = responseText.split('```json')[1].split('```')[0];
      } else if (responseText.includes('```')) {
        responseText = responseText.split('```')[1].split('```')[0];
      }

      const result = JSON.parse(responseText.trim());
      setPreviewTransactions(result);
      await logAudit('ai_processing_success', { fileName: file.name, transactionCount: result.length });
    } catch (err: any) {
      console.error("AI Processing Error:", err);
      await logAudit('ai_processing_error', { 
        fileName: file.name, 
        fileSize: file.size,
        errorMessage: err.message
      });
      setError(`Não foi possível processar o arquivo. Verifique se o formato é suportado ou se o arquivo contém dados válidos. (${err.message || 'Erro na IA'})`);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveTransactions = async () => {
    if (!auth.currentUser) return;
    setIsSaving(true);

    try {
      const batch = previewTransactions.map(t => 
        addDoc(collection(db, 'transactions'), {
          ...t,
          userId: auth.currentUser?.uid,
          createdAt: new Date().toISOString()
        })
      );

      await Promise.all(batch);
      onSuccess();
      onClose();
    } catch (err) {
      setError("Erro ao salvar transações no banco de dados.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Importar Extrato</h2>
            <p className="text-sm text-zinc-500">Processamento inteligente com IA</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!file && (
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer
                ${isDragActive ? 'border-sublime bg-sublime/5' : 'border-zinc-200 hover:border-sublime/50 hover:bg-zinc-50'}`}
            >
              <input {...getInputProps()} />
              <div className="bg-sublime/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="text-sublime" size={32} />
              </div>
              <h3 className="font-bold text-lg mb-1">Arraste seu arquivo aqui</h3>
              <p className="text-sm text-zinc-500">Suporta CSV, OFX e TXT</p>
            </div>
          )}

          {file && !previewTransactions.length && (
            <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-xl shadow-sm">
                  {file.name.endsWith('.csv') ? <FileText className="text-blue-500" /> : <FileCode className="text-orange-500" />}
                </div>
                <div>
                  <p className="font-bold text-zinc-900">{file.name}</p>
                  <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button 
                onClick={() => setFile(null)}
                className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                Remover
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-700">
              <AlertCircle size={20} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {previewTransactions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-zinc-900">Transações Encontradas ({previewTransactions.length})</h3>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-bold">IA Processada</span>
              </div>
              <div className="space-y-2">
                {previewTransactions.map((t, i) => (
                  <div key={i} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${t.type === 'entrada' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="text-sm font-bold text-zinc-900">{t.description}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{t.category} • {t.date}</p>
                      </div>
                    </div>
                    <p className={`font-bold ${t.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.type === 'entrada' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl font-bold text-zinc-600 hover:bg-zinc-100 transition-all"
          >
            Cancelar
          </button>
          {!previewTransactions.length ? (
            <button 
              disabled={!file || isProcessing}
              onClick={processWithAI}
              className="flex-[2] py-3 px-4 bg-sublime text-white rounded-2xl font-bold shadow-lg shadow-sublime/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processando com IA...
                </>
              ) : (
                <>
                  <FileText size={20} />
                  Analisar Extrato
                </>
              )}
            </button>
          ) : (
            <button 
              disabled={isSaving}
              onClick={saveTransactions}
              className="flex-[2] py-3 px-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Salvando...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Confirmar e Importar
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
