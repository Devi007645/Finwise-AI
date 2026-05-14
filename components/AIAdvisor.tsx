import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { FinanceTransaction, FinancialProfile, InvoiceRecord } from '../hooks/useFinanceData';

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};

type Conversation = {
  id: string;
  title: string;
  updated_at: string;
};

type StoredMessage = {
  content: string;
  ai_response: string;
  created_at: string;
};

const WELCOME_MESSAGE =
  "Hi! I'm SKAI, your Systamatic Finance Knowlege of AI. Ask me about taxes, GST, advance tax deadlines, or how to optimize your freelance finances.";

const DEFAULT_SUGGESTIONS = [
  "How much advance tax do I owe this quarter?",
  "How do I handle TDS on my Upwork income?",
  "Should I register for GST?",
];

const chatMemory: Record<
  string,
  {
    activeConversationId: string | null;
    messages: ChatMessage[];
    suggestions: string[];
  }
> = {};

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-vercel-black">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}

function MessageText({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      {text.split(/\n+/).map((line, index) => {
        const trimmed = line.trim();
        const bullet = trimmed.match(/^[-*]\s+(.+)/);
        const numbered = trimmed.match(/^(\d+)\.\s+(.+)/);

        if (!trimmed) return null;

        if (bullet) {
          return (
            <div key={index} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-vercel-black/70 flex-shrink-0" />
              <span>{renderInline(bullet[1])}</span>
            </div>
          );
        }

        if (numbered) {
          return (
            <div key={index} className="flex gap-2">
              <span className="text-xs font-semibold text-vercel-text tabular-nums w-5 flex-shrink-0">
                {numbered[1]}.
              </span>
              <span>{renderInline(numbered[2])}</span>
            </div>
          );
        }

        return <p key={index}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

type AIAdvisorProps = {
  profile: FinancialProfile | null;
  transactions: FinanceTransaction[];
  invoices: InvoiceRecord[];
};

export function AIAdvisor({ profile, transactions, invoices }: AIAdvisorProps) {
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: WELCOME_MESSAGE }
  ]);
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const rememberChat = (
    nextUserId: string | null = userId,
    nextConversationId: string | null = activeConversationId,
    nextMessages: ChatMessage[] = messages,
    nextSuggestions: string[] = suggestions,
  ) => {
    if (!nextUserId) return;

    chatMemory[nextUserId] = {
      activeConversationId: nextConversationId,
      messages: nextMessages,
      suggestions: nextSuggestions,
    };
  };

  const loadMessages = async (conversationId: string, currentUserId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("content, ai_response, created_at")
      .eq("user_id", currentUserId)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const restored = (data as StoredMessage[] | null)?.flatMap((item) => [
      { role: "user" as const, text: item.content },
      { role: "assistant" as const, text: item.ai_response },
    ]);

    const nextMessages = restored?.length
      ? restored
      : [{ role: "assistant" as const, text: WELCOME_MESSAGE }];

    setMessages(nextMessages);
    rememberChat(currentUserId, conversationId, nextMessages);
  };

  const createConversationRecord = async (currentUserId: string, title = "New conversation") => {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: currentUserId, title })
      .select("id, title, updated_at")
      .single();

    if (error) throw error;

    return data as Conversation;
  };

  useEffect(() => {
    let ignore = false;

    async function loadConversations() {
      setHistoryLoading(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id;

        if (!currentUserId) {
          setHistoryLoading(false);
          return;
        }

        const cached = chatMemory[currentUserId];
        setUserId(currentUserId);

        if (cached) {
          setActiveConversationId(cached.activeConversationId);
          setMessages(cached.messages);
          setSuggestions(cached.suggestions);
        }

        const { data, error } = await supabase
          .from("conversations")
          .select("id, title, updated_at")
          .eq("user_id", currentUserId)
          .order("updated_at", { ascending: false });

        if (error) throw error;
        if (ignore) return;

        const savedConversations = (data || []) as Conversation[];
        setConversations(savedConversations);

        if (!savedConversations.length) {
          const nextMessages = [{ role: "assistant" as const, text: WELCOME_MESSAGE }];
          setMessages(nextMessages);
          setActiveConversationId(null);
          rememberChat(currentUserId, null, nextMessages, DEFAULT_SUGGESTIONS);
          return;
        }

        const preferredId =
          cached?.activeConversationId &&
          savedConversations.some((conversation) => conversation.id === cached.activeConversationId)
            ? cached.activeConversationId
            : savedConversations[0].id;

        setActiveConversationId(preferredId);

        if (!cached || cached.activeConversationId !== preferredId) {
          await loadMessages(preferredId, currentUserId);
        }
      } catch (err) {
        console.error(err);
        setMessages([
          {
            role: "assistant",
            text: "Error: I couldn't load your SKAI chat history yet.",
          },
        ]);
      } finally {
        if (!ignore) setHistoryLoading(false);
      }
    }

    loadConversations();

    return () => {
      ignore = true;
    };
  }, []);

  const switchConversation = async (conversationId: string) => {
    if (!userId || conversationId === activeConversationId) return;

    setActiveConversationId(conversationId);
    rememberChat(userId, conversationId);
    setHistoryLoading(true);

    try {
      await loadMessages(conversationId, userId);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const startNewConversation = async () => {
    if (!userId || loading) return;

    try {
      const conversation = await createConversationRecord(userId);
      const nextMessages = [{ role: "assistant" as const, text: WELCOME_MESSAGE }];

      setConversations(prev => [conversation, ...prev]);
      setActiveConversationId(conversation.id);
      setMessages(nextMessages);
      setSuggestions(DEFAULT_SUGGESTIONS);
      rememberChat(userId, conversation.id, nextMessages, DEFAULT_SUGGESTIONS);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: "assistant", text: "Error: I couldn't create a new SKAI conversation." }]);
    }
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    const nextMessages = [...messages, { role: "user" as const, text: userMsg }];
    setMessages(nextMessages);
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("You must be logged in to use the AI Advisor.");
      }

      const currentUserId = session.user.id;
      let conversationId = activeConversationId;

      if (!conversationId) {
        const conversation = await createConversationRecord(currentUserId, userMsg.slice(0, 60));
        conversationId = conversation.id;
        setUserId(currentUserId);
        setActiveConversationId(conversation.id);
        setConversations(prev => [conversation, ...prev]);
      }

      const history = messages.map(m => ({ 
        role: m.role === "assistant" ? "assistant" : "user", 
        content: m.text 
      })).filter(m => m.content !== WELCOME_MESSAGE);

      const income = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);
      const tds = transactions.filter(t => t.type === "tds").reduce((sum, t) => sum + Number(t.amount), 0);
      const financeContext = [
        `Primary income source: ${profile?.primary_income_source || "not set"}`,
        `GST registered: ${profile?.gst_registered ? "yes" : "no"}`,
        `Tax regime: ${profile?.tax_regime || "new"}`,
        `Recorded income: ${income}`,
        `Recorded expenses: ${expenses}`,
        `Recorded TDS: ${tds}`,
        `Invoices/receipts saved: ${invoices.length}`,
        `Recent records: ${transactions.slice(0, 5).map(t => `${t.type} ${t.amount} ${t.category} ${t.description}`).join("; ") || "none"}`,
      ].join("\n");

      // Send JWT to FastAPI backend
      const res = await fetch(`http://127.0.0.1:8000/api/chat`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          history: history,
          message: userMsg,
          conversation_id: conversationId,
          finance_context: financeContext,
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Unknown API error");
      
      const reply = data.response || "Sorry, I couldn't get a response. Please try again.";
      const answeredMessages = [...nextMessages, { role: "assistant" as const, text: reply }];
      setMessages(answeredMessages);

      setConversations(prev => {
        const updated = prev.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                title: userMsg.slice(0, 60) || conversation.title,
                updated_at: new Date().toISOString(),
              }
            : conversation
        );

        return updated.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      });

      if (Array.isArray(data.follow_ups) && data.follow_ups.length > 0) {
        const nextSuggestions = data.follow_ups.slice(0, 3);
        setSuggestions(nextSuggestions);
        rememberChat(currentUserId, conversationId, answeredMessages, nextSuggestions);
      } else {
        rememberChat(currentUserId, conversationId, answeredMessages);
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { role: "assistant", text: `Error: ${err.message || "Connection failed."}` }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[480px] bg-white shadow-v-card rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-vercel-black text-white shadow-v-border flex items-center justify-center font-semibold tracking-tight">
            S
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-vercel-black">SKAI</div>
            <div className="text-xs text-vercel-text truncate">Systamatic Finance Knowlege of AI</div>
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <select
            value={activeConversationId || ""}
            onChange={(event) => switchConversation(event.target.value)}
            disabled={historyLoading || !conversations.length}
            className="max-w-[190px] text-xs px-2 py-1.5 rounded-md bg-white shadow-v-border text-vercel-text outline-none focus:shadow-v-focus disabled:opacity-60"
          >
            {!conversations.length && <option value="">No saved chats</option>}
            {conversations.map((conversation) => (
              <option key={conversation.id} value={conversation.id}>
                {conversation.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={startNewConversation}
            disabled={loading || historyLoading || !userId}
            className="text-xs px-3 py-1.5 rounded-md bg-vercel-black text-white shadow-v-border hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vercel-blue"
          >
            New chat
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-4 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs shadow-v-border flex-shrink-0 ${
              m.role === "user" ? "bg-vercel-black text-white" : "bg-gray-100 text-vercel-black"
            }`}>
              {m.role === "user" ? "You" : "S"}
            </div>
            <div className={`max-w-[80%] text-sm leading-relaxed p-4 rounded-xl shadow-v-border ${
              m.role === "user" ? "bg-gray-50 text-vercel-black rounded-tr-sm" : "bg-white text-vercel-black rounded-tl-sm"
            }`}>
              <MessageText text={m.text} />
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-gray-100 text-vercel-black flex items-center justify-center font-medium text-xs shadow-v-border flex-shrink-0 animate-pulse">AI</div>
            <div className="bg-white shadow-v-border p-4 rounded-xl rounded-tl-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex flex-wrap gap-2 mb-4 px-2">
          {suggestions.map(s => (
            <button 
              key={s} 
              onClick={() => setInput(s)}
              className="text-xs px-3 py-1.5 bg-white text-vercel-text rounded-full shadow-v-border hover:text-vercel-black hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vercel-blue"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Ask your financial co-pilot…" 
            className="flex-1 text-base md:text-sm px-4 py-2.5 rounded-lg shadow-v-border outline-none focus:shadow-v-focus transition-shadow placeholder:text-gray-400"
          />
          <button 
            onClick={send} 
            disabled={!input.trim() || loading}
            className="bg-vercel-black text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-v-border hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vercel-blue focus-visible:ring-offset-2"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
