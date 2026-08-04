import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Job, Customer, Material, User } from '@/lib/types';

// Generic types
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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

// Bind the untyped shared client to our schema so query-builder chains are typed
const typedSupabase = supabase as unknown as SupabaseClient<Database>;

export async function getRows<T extends TableName>(
  table: T,
  filters: [string, string, unknown][] = []
): Promise<Database['public']['Tables'][T]['Row'][]> {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }

  let query: any = (typedSupabase.from(table) as any).select('*');
  for (const [column, operator, value] of filters) {
    query = query[operator](column, value);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getRowById<T extends TableName>(
  table: T,
  id: string
): Promise<Database['public']['Tables'][T]['Row'] | null> {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }

  const { data, error } = await (typedSupabase.from(table) as any).select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function insertRow<T extends TableName>(
  table: T,
  data: Database['public']['Tables'][T]['Insert']
): Promise<Database['public']['Tables'][T]['Row']> {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }

  const { data: inserted, error } = await (typedSupabase.from(table) as any).insert(data).single();
  if (error) throw error;
  return inserted;
}

export async function updateRow<T extends TableName>(
  table: T,
  id: string,
  data: Database['public']['Tables'][T]['Update']
): Promise<Database['public']['Tables'][T]['Row']> {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }

  const { data: updated, error } = await (typedSupabase.from(table) as any).update(data).eq('id', id).select().single();
  if (error) throw error;
  return updated;
}

export async function deleteRow<T extends TableName>(
  table: T,
  id: string
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }

  const { error } = await (typedSupabase.from(table) as any).delete().eq('id', id);
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