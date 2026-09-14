import { z } from 'zod';

// Job input validation schema
// Legacy generic (kept for compat) - all optional
export const jobInputSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID').optional(),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long').optional(),
  admin_hourly_rate: z.number().min(0, 'Too small: expected number to be >=0').optional(),
  admin_notes: z.string().max(1000, 'Notes too long').optional(),
  assigned_to: z.string().uuid('Invalid assigned technician ID').optional(),
});

// Split schemas for role-based flow: tech creates qty/desc, owner sets pricing
export const jobCreateByOwnerSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  description: z.string().min(1, 'Description is required').max(500).trim(),
  admin_hourly_rate: z.number().min(0).or(z.string().regex(/^\d+(\.\d+)?$/).transform(Number)),
  admin_notes: z.string().max(1000).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  technician_notes: z.string().max(1000).optional(),
});
export const jobCreateByTechnicianSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  description: z.string().min(1, 'Description is required').max(500).trim(),
  technician_notes: z.string().max(1000).optional(),
  // tech must NOT send pricing - stripped if present
});
export const jobUpdatePricingByOwnerSchema = z.object({
  admin_hourly_rate: z.number().min(0).optional(),
  admin_notes: z.string().max(1000).optional(),
  description: z.string().min(1).max(500).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
});
export const jobUpdateByTechnicianSchema = z.object({
  technician_notes: z.string().max(1000).optional(),
  description: z.string().min(1).max(500).optional(),
});

// Job material split: tech qty, owner price
export const jobMaterialQtySchema = z.object({
  material_id: z.string().uuid().optional(),
  custom_name: z.string().max(200).optional(),
  quantity: z.number().positive().max(10000),
}).refine(d => d.material_id || d.custom_name, 'material_id or custom_name required');
export const jobMaterialPriceSchema = z.object({
  admin_unit_price: z.number().min(0).max(100000),
});

export function validateWith<T>(schema: z.ZodSchema<T>, data: unknown): string[] {
  try { schema.parse(data); return []; } catch (e) { if (e instanceof z.ZodError) return e.issues.map(i => `${i.path.join('.')}: ${i.message}`); throw e; }
}

// Invoice input validation schema
export const invoiceInputSchema = z.object({
  job_card_id: z.string().uuid('Invalid job card ID'),
});

// Payment input validation schema
export const paymentInputSchema = z.object({
  invoice_id: z.string().uuid('Invalid invoice ID'),
  amount: z.number().positive('Payment amount must be positive').max(1000000, 'Payment amount too large'),
  method: z.enum(['cash', 'card', 'bank_transfer', 'check', 'eft', 'other']).default('cash'),
  note: z.string().max(500, 'Note too long').optional(),
});

// Procurement input validation schema
export const procurementItemSchema = z.object({
  material_id: z.string().uuid('Invalid material ID').optional(),
  custom_name: z.string().max(200, 'Custom name too long').optional(),
  quantity: z.number().int().positive('Quantity must be a positive integer').max(10000, 'Quantity too large'),
  supplier_id: z.string().uuid('Invalid supplier ID').optional(),
}).refine(
  (data) => data.material_id || data.custom_name,
  'Either material_id or custom_name must be provided'
);

export const procurementInputSchema = z.object({
  items: z.array(procurementItemSchema).min(1, 'At least one item is required'),
  message: z.string().max(1000, 'Message too long').optional(),
  send_method: z.enum(['email', 'whatsapp']).optional(),
});

// Schedule input validation schema
export const scheduleItemSchema = z.object({
  profile_id: z.string().uuid('Invalid profile ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  status: z.enum(['available', 'unavailable', 'partial']),
  notes: z.string().max(500, 'Notes too long').optional(),
});

export const scheduleInputSchema = z.array(scheduleItemSchema).min(1, 'At least one schedule item is required');

// Staff input validation schema
export const staffInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  full_name: z.string().min(1, 'Full name is required').max(100, 'Full name too long'),
  role: z.enum(['technician', 'accountant']),
  phone: z.string().regex(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/i, 'Invalid phone number').optional(),
});

// WhatsApp config input validation schema
export const whatsappConfigInputSchema = z.object({
  base_url: z.string().url('Invalid URL'),
  session_name: z.string().min(1, 'Session name is required').default('main'),
  enabled: z.boolean().default(true),
  reminder_template: z.string().min(1, 'Reminder template is required').max(500, 'Template too long'),
});

// Magic link input validation schema
export const magicLinkInputSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Export input validation schema
export const exportInputSchema = z.object({
  jobIds: z.array(z.string().uuid('Invalid job ID')).min(1, 'At least one job ID is required'),
});

// Helper validation functions
export function validateJobInput(data: unknown): string[] {
  try {
    jobInputSchema.parse(data);
    return [];
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    }
    throw error;
  }
}

export function validateInvoiceInput(data: unknown): string[] {
  try {
    invoiceInputSchema.parse(data);
    return [];
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    }
    throw error;
  }
}

export function validatePaymentInput(data: unknown): string[] {
  try {
    paymentInputSchema.parse(data);
    return [];
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    }
    throw error;
  }
}

export function validateProcurementInput(data: unknown): string[] {
  try {
    procurementInputSchema.parse(data);
    return [];
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    }
    throw error;
  }
}

export function validateScheduleInput(data: unknown): string[] {
  try {
    scheduleInputSchema.parse(data);
    return [];
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    }
    throw error;
  }
}

export function validateStaffInput(data: unknown): string[] {
  try {
    staffInputSchema.parse(data);
    return [];
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    }
    throw error;
  }
}

export function validateWhatsAppConfigInput(data: unknown): string[] {
  try {
    whatsappConfigInputSchema.parse(data);
    return [];
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    }
    throw error;
  }
}

export function validateMagicLinkInput(data: unknown): string[] {
  try {
    magicLinkInputSchema.parse(data);
    return [];
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    }
    throw error;
  }
}

export function validateExportInput(data: unknown): string[] {
  try {
    exportInputSchema.parse(data);
    return [];
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    }
    throw error;
  }
}