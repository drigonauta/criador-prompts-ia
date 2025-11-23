import { createClient } from '@supabase/supabase-js';

// Access environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a single supabase client for interacting with your database
export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export interface Lead {
    id?: string;
    created_at?: string;
    name: string;
    whatsapp: string;
    email: string;
    usage_count: number;
    usage_limit: number;
    last_usage_at?: string;
}

// --- Lead Management Functions ---

export const registerLead = async (name: string, whatsapp: string, email: string): Promise<boolean> => {
    if (!supabase) {
        console.warn("Supabase not configured. Using localStorage fallback.");
        return true; // Allow in local mode
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
        .from('leads')
        .select('*')
        .eq('whatsapp', whatsapp)
        .single();

    if (existingUser) {
        return true; // User already exists
    }

    const { error } = await supabase
        .from('leads')
        .insert([{ name, whatsapp, email, usage_count: 0, usage_limit: 1 }]);

    if (error) {
        console.error("Error registering lead:", error);
        return false;
    }
    return true;
};

export const checkLeadAccess = async (whatsapp: string, _feature: string): Promise<{ allowed: boolean; limitReached: boolean }> => {
    if (!supabase) {
        // Fallback to localStorage logic implemented in userUtils (or duplicated here if we want to unify)
        // For now, we'll assume the caller handles the fallback or we just return true for dev
        return { allowed: true, limitReached: false };
    }

    const { data: lead, error } = await supabase
        .from('leads')
        .select('usage_count, usage_limit')
        .eq('whatsapp', whatsapp)
        .single();

    if (error || !lead) {
        // If lead not found (maybe registered before db wipe), allow or re-register? 
        // For safety, block if strictly enforcing, but for UX, maybe allow 1.
        return { allowed: false, limitReached: false };
    }

    if (lead.usage_count >= lead.usage_limit) {
        return { allowed: false, limitReached: true };
    }

    return { allowed: true, limitReached: false };
};

export const incrementLeadUsage = async (whatsapp: string) => {
    if (!supabase) return;

    // First get current count to increment safely, or use rpc if set up. 
    // Simple approach:
    const { data: lead } = await supabase.from('leads').select('usage_count').eq('whatsapp', whatsapp).single();

    if (lead) {
        await supabase
            .from('leads')
            .update({ usage_count: lead.usage_count + 1, last_usage_at: new Date().toISOString() })
            .eq('whatsapp', whatsapp);
    }
};

// --- Admin Functions ---

export const getAllLeads = async () => {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching leads:", error);
        return [];
    }
    return data;
};

export const updateLeadLimit = async (id: string, newLimit: number) => {
    if (!supabase) return;

    const { error } = await supabase
        .from('leads')
        .update({ usage_limit: newLimit })
        .eq('id', id);

    if (error) {
        console.error("Error updating limit:", error);
        throw error;
    }
};
