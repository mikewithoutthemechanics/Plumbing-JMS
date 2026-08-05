import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { validateProcurementInput } from '@/lib/validation';

export const dynamic = 'force-dynamic';

interface ProcurementItem {
  material_id?: string;
  custom_name?: string;
  quantity: number;
  supplier_id?: string;
}

interface SupplierInfo {
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
}

interface MaterialWithSupplier {
  id: string;
  name: string;
  quantity_on_hand: number;
  unit: string;
  supplier_id?: string | null;
  suppliers: SupplierInfo | SupplierInfo[] | null;
}

interface ProcurementSupplierData {
  supplier: SupplierInfo | null;
  items: string[];
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['owner', 'technician'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Validate input
    const validationErrors = validateProcurementInput(body);
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: validationErrors.join(', ') }, { status: 400 });
    }

    const { items, message } = body as {
      items: ProcurementItem[];
      message?: string;
    };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    // Get material details and suppliers
    const materialIds = items.filter(i => i.material_id).map(i => i.material_id as string);
    const itemMaterials = items.filter(i => i.material_id);

    const { data: materials } = await supabase
      .from('materials')
      .select('id, name, quantity_on_hand, unit, supplier_id, suppliers(name, email, phone, whatsapp)')
      .in('id', materialIds) as { data: MaterialWithSupplier[] | null };

    // Group items by supplier
    const supplierItems = new Map<string, ProcurementSupplierData>();

    for (const item of itemMaterials) {
      const mat = materials?.find(m => m.id === item.material_id);
      if (mat?.suppliers) {
        const sup = Array.isArray(mat.suppliers) ? mat.suppliers[0] : mat.suppliers;
        if (sup && !supplierItems.has(sup.name)) {
          supplierItems.set(sup.name, { supplier: sup, items: [] });
        }
        if (sup) {
          supplierItems.get(sup.name)?.items.push(
            `${mat.name} (${item.quantity} ${mat.unit})`
          );
        }
      }
    }

    // Add custom items with no supplier
    const customItems = items.filter(i => !i.material_id && i.custom_name);
    if (customItems.length > 0) {
      supplierItems.set('Custom Order', {
        supplier: null,
        items: customItems.map(i => `${i.custom_name} (${i.quantity})`)
      });
    }

    // Generate procurement messages
    const procurementMessages = [];
    for (const [, data] of supplierItems) {
      const itemList = data.items.join('\n  - ');
      procurementMessages.push({
        supplier: data.supplier?.name || 'Custom Order',
        email: data.supplier?.email,
        phone: data.supplier?.whatsapp || data.supplier?.phone,
        message: `New procurement order:\n  - ${itemList}\n\n${message || ''}\n\nPlease confirm availability and delivery time.`
      });
    }

    // In production, integrate with email/SMS provider
    // For demo, just log the messages
    console.log('Procurement messages:', procurementMessages);

    return NextResponse.json({
      success: true,
      messages: procurementMessages.map(m => ({
        supplier: m.supplier,
        contact: m.email || m.phone,
        preview: m.message
      }))
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}