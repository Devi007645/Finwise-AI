-- Create user profile table
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  created_at timestamp default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;

-- Policy: user can only access their own data
create policy "Users can access their own data"
on profiles
for all
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Create messages table for AI Advisor
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New conversation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own conversations" ON conversations
    FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own conversations" ON conversations
    FOR UPDATE TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own conversations" ON conversations
    FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own messages" ON messages
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS messages_user_id_idx ON messages(user_id);
CREATE INDEX IF NOT EXISTS conversations_user_id_updated_at_idx ON conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_idx ON messages(conversation_id, created_at ASC);

CREATE TABLE IF NOT EXISTS financial_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    monthly_income_estimate NUMERIC NOT NULL DEFAULT 0,
    monthly_expense_estimate NUMERIC NOT NULL DEFAULT 0,
    tds_estimate NUMERIC NOT NULL DEFAULT 0,
    advance_tax_paid NUMERIC NOT NULL DEFAULT 0,
    primary_income_source TEXT,
    gst_registered BOOLEAN NOT NULL DEFAULT false,
    tax_regime TEXT NOT NULL DEFAULT 'new',
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'tds')),
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    transaction_date DATE NOT NULL DEFAULT current_date,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    invoice_number TEXT,
    counterparty TEXT NOT NULL,
    record_type TEXT NOT NULL CHECK (record_type IN ('income', 'expense')),
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    invoice_date DATE NOT NULL DEFAULT current_date,
    category TEXT NOT NULL DEFAULT 'General',
    status TEXT NOT NULL DEFAULT 'Draft',
    notes TEXT,
    file_name TEXT,
    extracted_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE financial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own financial profile" ON financial_profiles
    FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can create own financial profile" ON financial_profiles
    FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own financial profile" ON financial_profiles
    FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can create own transactions" ON transactions
    FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own transactions" ON transactions
    FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own transactions" ON transactions
    FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view own invoices" ON invoices
    FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can create own invoices" ON invoices
    FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own invoices" ON invoices
    FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own invoices" ON invoices
    FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS transactions_user_id_date_idx ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS invoices_user_id_date_idx ON invoices(user_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS invoices_transaction_id_idx ON invoices(transaction_id);
