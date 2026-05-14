import { FormEvent, useState } from 'react';
import { Badge } from './ui/Badge';
import { fmt } from '../utils/formatters';
import { FinanceTransaction, InvoiceInput, InvoiceRecord, TransactionInput } from '../hooks/useFinanceData';
import { supabase } from '../lib/supabase';

type InvoicesProps = {
  invoices: InvoiceRecord[];
  transactions: FinanceTransaction[];
  addInvoice: (input: InvoiceInput) => Promise<InvoiceRecord>;
  addTransaction: (input: TransactionInput) => Promise<FinanceTransaction>;
};

const today = new Date().toISOString().slice(0, 10);

export function Invoices({ invoices, transactions, addInvoice, addTransaction }: InvoicesProps) {
  const [entryMode, setEntryMode] = useState<"invoice" | "transaction">("invoice");
  const [invoiceMode, setInvoiceMode] = useState<"upload" | "manual">("upload");
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [message, setMessage] = useState("");
  const [recordHint, setRecordHint] = useState<"income" | "expense">("income");
  const [invoiceForm, setInvoiceForm] = useState<InvoiceInput>({
    invoice_number: "",
    counterparty: "",
    record_type: "income",
    amount: 0,
    invoice_date: today,
    category: "Freelance",
    status: "Draft",
    notes: "",
    file_name: "",
    extracted_summary: "",
  });
  const [txForm, setTxForm] = useState<TransactionInput>({
    type: "expense",
    description: "",
    category: "Software",
    amount: 0,
    transaction_date: today,
    source: "",
  });

  const submitInvoice = async (event: FormEvent) => {
    event.preventDefault();
    if (!invoiceForm.counterparty || !invoiceForm.amount) return;
    setSaving(true);
    setMessage("");

    try {
      await addInvoice(invoiceForm);
      setInvoiceForm({
        invoice_number: "",
        counterparty: "",
        record_type: "income",
        amount: 0,
        invoice_date: today,
        category: "Freelance",
        status: "Draft",
        notes: "",
        file_name: "",
        extracted_summary: "",
      });
      setInvoiceMode("upload");
      setMessage("Invoice saved and reflected in dashboard, tax, and SKAI context.");
    } catch (err: any) {
      setMessage(err.message || "Could not save invoice.");
    } finally {
      setSaving(false);
    }
  };

  const submitTransaction = async (event: FormEvent) => {
    event.preventDefault();
    if (!txForm.description || !txForm.amount) return;
    setSaving(true);
    setMessage("");

    try {
      await addTransaction(txForm);
      setTxForm({ type: "expense", description: "", category: "Software", amount: 0, transaction_date: today, source: "" });
      setMessage("Transaction saved and reflected across Finwise.");
    } catch (err: any) {
      setMessage(err.message || "Could not save transaction.");
    } finally {
      setSaving(false);
    }
  };

  const extractFile = async (file: File | null) => {
    if (!file) return;
    setExtracting(true);
    setMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("You must be logged in to extract invoices.");

      const dataBase64 = await fileToBase64(file);
      const res = await fetch("http://127.0.0.1:8000/api/extract-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          file_name: file.name,
          mime_type: file.type || "application/octet-stream",
          data_base64: dataBase64,
          record_hint: recordHint,
        }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.detail || "Document extraction failed.");

      const extracted = payload.extracted || {};
      setInvoiceForm(prev => ({
        ...prev,
        file_name: file.name,
        record_type: extracted.record_type === "expense" ? "expense" : recordHint,
        counterparty: extracted.counterparty || prev.counterparty,
        invoice_number: extracted.invoice_number || prev.invoice_number,
        amount: Number(extracted.amount || prev.amount || 0),
        invoice_date: extracted.invoice_date || prev.invoice_date,
        category: extracted.category || prev.category,
        status: extracted.status || prev.status,
        notes: extracted.notes || prev.notes,
        extracted_summary: extracted.extracted_summary || prev.extracted_summary,
      }));
      setMessage("Document read by AI. Review the fields before saving.");
      setInvoiceMode("manual");
    } catch (err: any) {
      setMessage(err.message || "Could not extract document.");
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-v-card rounded-xl p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h2 className="text-sm font-medium text-vercel-black tracking-tight">Records and invoices</h2>
          <div className="flex rounded-md shadow-v-border overflow-hidden">
            {(["invoice", "transaction"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setEntryMode(mode)}
                className={`px-3 py-1.5 text-xs capitalize ${entryMode === mode ? "bg-vercel-black text-white" : "bg-white text-vercel-text"}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {message && <div className="mb-5 text-sm bg-gray-50 text-vercel-text p-3 rounded-md shadow-v-border">{message}</div>}

        {entryMode === "invoice" ? (
          <div className="space-y-4">
            <div className="flex gap-4 border-b border-gray-100 pb-4 mb-4">
              <button
                onClick={() => setInvoiceMode("upload")}
                className={`text-sm font-medium px-4 py-2 rounded-md transition-colors ${invoiceMode === "upload" ? "bg-vercel-black text-white" : "bg-gray-50 text-vercel-text hover:bg-gray-100"}`}
              >
                Upload Document
              </button>
              <button
                onClick={() => setInvoiceMode("manual")}
                className={`text-sm font-medium px-4 py-2 rounded-md transition-colors ${invoiceMode === "manual" ? "bg-vercel-black text-white" : "bg-gray-50 text-vercel-text hover:bg-gray-100"}`}
              >
                Manual Entry
              </button>
            </div>

            {invoiceMode === "upload" && (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 bg-gray-50 flex flex-col items-center justify-center text-center space-y-4">
                <div className="text-vercel-text">
                  <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm font-medium">Upload invoice or receipt</p>
                  <p className="text-xs mt-1">AI will extract the details automatically</p>
                </div>
                
                <div className="flex items-center gap-4 w-full max-w-md">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/*"
                    onChange={e => extractFile(e.target.files?.[0] || null)}
                    className="w-full text-sm px-3 py-2 bg-white rounded-md shadow-v-border"
                  />
                </div>
                
                <div className="flex items-center gap-3 mt-2 w-full max-w-md justify-center">
                  <span className="text-xs font-medium text-vercel-text">AI Hint:</span>
                  <div className="flex bg-white rounded-md shadow-v-border overflow-hidden">
                    <button type="button" onClick={() => setRecordHint("income")} className={`px-3 py-1 text-xs ${recordHint === "income" ? "bg-vercel-black text-white" : "text-vercel-text"}`}>Income</button>
                    <button type="button" onClick={() => setRecordHint("expense")} className={`px-3 py-1 text-xs ${recordHint === "expense" ? "bg-vercel-black text-white" : "text-vercel-text"}`}>Expense</button>
                  </div>
                </div>

                {extracting && <p className="text-sm font-medium text-vercel-black animate-pulse">Reading document with AI...</p>}
              </div>
            )}

            {invoiceMode === "manual" && (
              <form onSubmit={submitInvoice} className="space-y-4">
                {invoiceForm.file_name && (
                  <div className="text-xs bg-green-50 text-green-700 px-3 py-2 rounded-md border border-green-100 flex justify-between items-center">
                    <span>Extracted from: <strong>{invoiceForm.file_name}</strong>. Please review the fields below.</span>
                  </div>
                )}
                
                <div className="grid md:grid-cols-3 gap-4">
                  <Field label="Client/vendor" value={invoiceForm.counterparty} onChange={value => setInvoiceForm({ ...invoiceForm, counterparty: value })} />
                  <Field label="Invoice number" value={invoiceForm.invoice_number || ""} onChange={value => setInvoiceForm({ ...invoiceForm, invoice_number: value })} />
                  <NumberField label="Amount" value={invoiceForm.amount} onChange={value => setInvoiceForm({ ...invoiceForm, amount: value })} />
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <Select label="Type" value={invoiceForm.record_type} onChange={value => setInvoiceForm({ ...invoiceForm, record_type: value as "income" | "expense" })} options={["income", "expense"]} />
                  <Field label="Category" value={invoiceForm.category} onChange={value => setInvoiceForm({ ...invoiceForm, category: value })} />
                  <Field label="Date" type="date" value={invoiceForm.invoice_date} onChange={value => setInvoiceForm({ ...invoiceForm, invoice_date: value })} />
                  <Select label="Status" value={invoiceForm.status} onChange={value => setInvoiceForm({ ...invoiceForm, status: value })} options={["Draft", "Sent", "Paid", "Overdue", "Recorded"]} />
                </div>

                {invoiceForm.extracted_summary && (
                  <div className="text-xs text-vercel-text bg-gray-50 rounded-md p-3 shadow-v-border">{invoiceForm.extracted_summary}</div>
                )}

                <button disabled={saving} className="bg-vercel-black text-white px-4 py-2 rounded-md text-sm font-medium shadow-v-border disabled:opacity-50">
                  {saving ? "Saving..." : "Save invoice record"}
                </button>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={submitTransaction} className="space-y-4">
            <div className="grid md:grid-cols-5 gap-4">
              <Select label="Type" value={txForm.type} onChange={value => setTxForm({ ...txForm, type: value as "income" | "expense" | "tds" })} options={["income", "expense", "tds"]} />
              <Field label="Description" value={txForm.description} onChange={value => setTxForm({ ...txForm, description: value })} />
              <Field label="Category" value={txForm.category} onChange={value => setTxForm({ ...txForm, category: value })} />
              <NumberField label="Amount" value={txForm.amount} onChange={value => setTxForm({ ...txForm, amount: value })} />
              <Field label="Date" type="date" value={txForm.transaction_date} onChange={value => setTxForm({ ...txForm, transaction_date: value })} />
            </div>
            <button disabled={saving} className="bg-vercel-black text-white px-4 py-2 rounded-md text-sm font-medium shadow-v-border disabled:opacity-50">
              {saving ? "Saving..." : "Add transaction"}
            </button>
          </form>
        )}
      </div>

      <div className="bg-white shadow-v-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-vercel-text">
                <th className="font-medium p-4 tracking-tight">Record</th>
                <th className="font-medium p-4 tracking-tight">Party</th>
                <th className="font-medium p-4 tracking-tight">Amount</th>
                <th className="font-medium p-4 tracking-tight">Date</th>
                <th className="font-medium p-4 tracking-tight">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm text-vercel-black">
              {invoices.map(i => (
                <tr key={i.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-medium tabular-nums">{i.invoice_number || i.id.slice(0, 8)}</td>
                  <td className="p-4">{i.counterparty}</td>
                  <td className="p-4 tabular-nums">{fmt(Number(i.amount))}</td>
                  <td className="p-4 text-vercel-text tabular-nums">{i.invoice_date}</td>
                  <td className="p-4"><Badge type={i.record_type === "income" ? "income" : "expense"} /></td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-sm text-vercel-text">No invoices yet. Upload or create your first record.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white shadow-v-card rounded-xl p-6">
        <h2 className="text-sm font-medium mb-4 text-vercel-black tracking-tight">Manual transactions</h2>
        <div className="divide-y divide-gray-100">
          {transactions.slice(0, 6).map(t => (
            <div key={t.id} className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm font-medium">{t.description}</div>
                <div className="text-xs text-vercel-text">{t.transaction_date} · {t.category}</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge type={t.type} />
                <span className="text-sm tabular-nums">{fmt(Number(t.amount))}</span>
              </div>
            </div>
          ))}
          {transactions.length === 0 && <div className="text-sm text-vercel-text">No transactions added yet.</div>}
        </div>
      </div>
    </div>
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full text-base md:text-sm px-3 py-2 rounded-md shadow-v-border outline-none focus:shadow-v-focus" required />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input type="number" min="0" value={value} onChange={e => onChange(Number(e.target.value))} className="w-full text-base md:text-sm px-3 py-2 rounded-md shadow-v-border outline-none focus:shadow-v-focus tabular-nums" required />
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full text-base md:text-sm px-3 py-2 rounded-md bg-white shadow-v-border outline-none focus:shadow-v-focus capitalize">
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}
