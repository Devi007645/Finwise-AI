import { useCallback, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export type FinancialProfile = {
  user_id: string;
  monthly_income_estimate: number;
  monthly_expense_estimate: number;
  tds_estimate: number;
  advance_tax_paid: number;
  primary_income_source: string | null;
  gst_registered: boolean;
  tax_regime: "new" | "old" | string;
  onboarding_completed: boolean;
};

export type FinanceTransaction = {
  id: string;
  user_id: string;
  type: "income" | "expense" | "tds";
  description: string;
  category: string;
  amount: number;
  transaction_date: string;
  source: string | null;
  created_at: string;
};

export type InvoiceRecord = {
  id: string;
  user_id: string;
  transaction_id: string | null;
  invoice_number: string | null;
  counterparty: string;
  record_type: "income" | "expense";
  amount: number;
  invoice_date: string;
  category: string;
  status: string;
  notes: string | null;
  file_name: string | null;
  extracted_summary: string | null;
  created_at: string;
};

export type OnboardingInput = {
  monthly_income_estimate: number;
  monthly_expense_estimate: number;
  tds_estimate: number;
  advance_tax_paid: number;
  primary_income_source: string;
  gst_registered: boolean;
  tax_regime: "new" | "old";
};

export type TransactionInput = {
  type: "income" | "expense" | "tds";
  description: string;
  category: string;
  amount: number;
  transaction_date: string;
  source?: string;
};

export type InvoiceInput = {
  invoice_number?: string;
  counterparty: string;
  record_type: "income" | "expense";
  amount: number;
  invoice_date: string;
  category: string;
  status: string;
  notes?: string;
  file_name?: string;
  extracted_summary?: string;
};

export function useFinanceData(session: Session | null) {
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = session?.user?.id;

  const load = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setTransactions([]);
      setInvoices([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [profileResult, txResult, invoiceResult] = await Promise.all([
      supabase.from("financial_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("invoices")
        .select("*")
        .eq("user_id", userId)
        .order("invoice_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (txResult.error) throw txResult.error;
    if (invoiceResult.error) throw invoiceResult.error;

    setProfile(profileResult.data as FinancialProfile | null);
    setTransactions((txResult.data || []) as FinanceTransaction[]);
    setInvoices((invoiceResult.data || []) as InvoiceRecord[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load().catch((error) => {
      console.error(error);
      setLoading(false);
    });
  }, [load]);

  const completeOnboarding = async (input: OnboardingInput) => {
    if (!userId) throw new Error("Missing signed-in user.");

    const { data, error } = await supabase
      .from("financial_profiles")
      .upsert({
        user_id: userId,
        ...input,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw error;
    setProfile(data as FinancialProfile);
  };

  const addTransaction = async (input: TransactionInput) => {
    if (!userId) throw new Error("Missing signed-in user.");

    const { data, error } = await supabase
      .from("transactions")
      .insert({ ...input, user_id: userId })
      .select("*")
      .single();

    if (error) throw error;
    setTransactions((prev) => [data as FinanceTransaction, ...prev]);
    return data as FinanceTransaction;
  };

  const addInvoice = async (input: InvoiceInput) => {
    if (!userId) throw new Error("Missing signed-in user.");

    const tx = await addTransaction({
      type: input.record_type,
      description: input.counterparty,
      category: input.category,
      amount: input.amount,
      transaction_date: input.invoice_date,
      source: input.invoice_number || "Invoice",
    });

    const { data, error } = await supabase
      .from("invoices")
      .insert({
        ...input,
        user_id: userId,
        transaction_id: tx.id,
      })
      .select("*")
      .single();

    if (error) throw error;
    setInvoices((prev) => [data as InvoiceRecord, ...prev]);
    return data as InvoiceRecord;
  };

  return {
    profile,
    transactions,
    invoices,
    loading,
    refreshFinanceData: load,
    completeOnboarding,
    addTransaction,
    addInvoice,
  };
}
