import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Job, Customer, Material, User } from '@/lib/types';

// Local schema describing our tables (used for return-type annotations only)
interface Database {
  public: {
    Tables: {
      jobs: { Row: Job; Insert: Omit<Job, 'id'>; Update: Partial<Job> };
      customers: { Row: Customer; Insert: Omit<Customer, 'id'>; Update: Partial<Customer> };
      materials: { Row: Material; Insert: Omit<Material, 'id'>; Update: Partial<Material> };
      users: { Row: User; Insert: Omit<User, 'id'>; Update: Partial<User> };
    };
  };
}

type TableName = keyof Database['public']['Tables'];

// Use the plain (untyped) client to avoid fighting Supabase's generic schema
// inference. Every boundary call is cast locally so the public helpers stay
// strongly typed.
const client = supabase as unknown as SupabaseClient;

export async function getRows<T extends TableName>(
  table: T,
  filters: [string, string, unknown][] = []
): Promise<Database['public']['Tables'][T]['Row'][]> {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }

  let query = client.from(table).select('*');
  for (const [column, operator, value] of filters) {
    const filterBuilder = query as unknown as Record<string, (col: string, val: unknown) => typeof query>;
    query = filterBuilder[operator]?.(column, value) ?? query;
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Database['public']['Tables'][T]['Row'][];
}

export async function getRowById<T extends TableName>(
  table: T,
  id: string
): Promise<Database['public']['Tables'][T]['Row'] | null> {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }

  const { data, error } = await client.from(table).select('*').eq('id', id).single();
  if (error) throw error;
  return data as unknown as Database['public']['Tables'][T]['Row'] | null;
}

export async function insertRow<T extends TableName>(
  table: T,
  data: Database['public']['Tables'][T]['Insert']
): Promise<Database['public']['Tables'][T]['Row']> {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }

  const { data: inserted, error } = await client
    .from(table)
    .insert(data as unknown as Record<string, unknown>)
    .single();
  if (error) throw error;
  return inserted as unknown as Database['public']['Tables'][T]['Row'];
}

export async function updateRow<T extends TableName>(
  table: T,
  id: string,
  data: Database['public']['Tables'][T]['Update']
): Promise<Database['public']['Tables'][T]['Row']> {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }

  const { data: updated, error } = await client
    .from(table)
    .update(data as unknown as Record<string, unknown>)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return updated as unknown as Database['public']['Tables'][T]['Row'];
}

export async function deleteRow<T extends TableName>(
  table: T,
  id: string
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }

  const { error } = await client.from(table).delete().eq('id', id);
  if (error) throw error;
}

// Specific exports for convenience
export const getJobs = (filters?: [string, string, unknown][]) => getRows('jobs', filters);
export const getJob = (id: string) => getRowById('jobs', id);
export const createJob = (data: Job) => insertRow('jobs', data);
export const updateJob = (id: string, data: Partial<Job>) => updateRow('jobs', id, data);
export const deleteJob = (id: string) => deleteRow('jobs', id);

export const getCustomers = (filters?: [string, string, unknown][]) => getRows('customers', filters);
export const getCustomer = (id: string) => getRowById('customers', id);
export const createCustomer = (data: Customer) => insertRow('customers', data);
export const updateCustomer = (id: string, data: Partial<Customer>) => updateRow('customers', id, data);
export const deleteCustomer = (id: string) => deleteRow('customers', id);

export const getMaterials = (filters?: [string, string, unknown][]) => getRows('materials', filters);
export const getMaterial = (id: string) => getRowById('materials', id);
export const createMaterial = (data: Material) => insertRow('materials', data);
export const updateMaterial = (id: string, data: Partial<Material>) => updateRow('materials', id, data);
export const deleteMaterial = (id: string) => deleteRow('materials', id);

export const getUsers = (filters?: [string, string, unknown][]) => getRows('users', filters);
export const getUser = (id: string) => getRowById('users', id);
export const createUser = (data: User) => insertRow('users', data);
export const updateUser = (id: string, data: Partial<User>) => updateRow('users', id, data);
export const deleteUser = (id: string) => deleteRow('users', id);
