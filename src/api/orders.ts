import { Hono } from "hono";

export const orderApi = new Hono();

export interface OrderItemPayload {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface CreateOrderPayload {
  id?: string;
  tracking: string;
  name: string;
  email?: string;
  phone: string;
  address: string;
  emirate: string;
  items: OrderItemPayload[];
  subtotal: number;
  deliveryFee: number;
  tax?: number;
  taxRate?: number;
  total: number;
  status?: string;
  paymentMethod?: string;
  notes?: string;
}

// In-memory fallback for local dev environment when D1 binding is not attached
const localOrdersFallback: any[] = [];

// Helper to convert D1 row to typed Order object
function formatD1Order(row: any) {
  let items: any[] = [];
  try {
    items = typeof row.items === "string" ? JSON.parse(row.items) : row.items || [];
  } catch {
    items = [];
  }

  let email: string | undefined = undefined;
  let tax: number | undefined = undefined;
  let taxRate: number | undefined = undefined;
  let ziinaPaymentId: string | undefined = undefined;

  if (row.notes) {
    try {
      const parsedNotes = JSON.parse(row.notes);
      if (typeof parsedNotes === "object" && parsedNotes !== null) {
        email = parsedNotes.email;
        tax = parsedNotes.tax;
        taxRate = parsedNotes.taxRate;
        ziinaPaymentId = parsedNotes.ziinaPaymentId;
      }
    } catch {
      // notes is plain string
    }
  }

  const createdAt = row.created_at ? new Date(row.created_at).getTime() : Date.now();

  return {
    id: row.id,
    tracking: row.tracking_number || row.tracking,
    name: row.customer_name || row.name,
    email: email || row.email,
    phone: row.phone,
    address: row.address,
    emirate: row.emirate,
    items,
    subtotal: Number(row.subtotal || 0),
    deliveryFee: Number(row.delivery_fee || row.deliveryFee || 0),
    tax: tax !== undefined ? Number(tax) : undefined,
    taxRate: taxRate !== undefined ? Number(taxRate) : undefined,
    total: Number(row.total || 0),
    status: row.status || "pending",
    paymentMethod: row.payment_method || "cod",
    createdAt,
    ziinaPaymentId,
  };
}

// 1. POST /api/orders - Insert new order into Cloudflare D1 Database
orderApi.post("/", async (c) => {
  try {
    const body: CreateOrderPayload = await c.req.json();
    const {
      tracking,
      name,
      email,
      phone,
      address,
      emirate,
      items,
      subtotal,
      deliveryFee,
      tax,
      taxRate,
      total,
      paymentMethod = "cod",
      status = "pending",
    } = body;

    if (!tracking || !name || !phone || !address || !emirate || !items || !Array.isArray(items)) {
      return c.json({ success: false, error: "Missing required order fields" }, 400);
    }

    const orderId = body.id || `ord-${Date.now()}`;
    const customerId = `cust-${Date.now()}`;
    const itemsJson = JSON.stringify(items);
    const createdAtStr = new Date().toISOString();

    const notesObj = {
      email: email?.trim() || undefined,
      tax: tax !== undefined ? Number(tax) : 0,
      taxRate: taxRate !== undefined ? Number(taxRate) : undefined,
    };
    const notesJson = JSON.stringify(notesObj);

    const env = (c.env as any) || {};
    const d1Db = env.DB;

    let savedInD1 = false;
    let d1Error: string | null = null;

    if (d1Db && typeof d1Db.prepare === "function") {
      try {
        // 1. Insert into orders table
        await d1Db
          .prepare(
            `INSERT INTO orders (id, tracking_number, customer_id, customer_name, phone, emirate, address, items, subtotal, delivery_fee, total, payment_method, status, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            orderId,
            tracking,
            customerId,
            name.trim(),
            phone.trim(),
            emirate.trim(),
            address.trim(),
            itemsJson,
            Number(subtotal),
            Number(deliveryFee),
            Number(total),
            paymentMethod,
            status,
            notesJson,
            createdAtStr,
          )
          .run();

        savedInD1 = true;

        // 2. Insert or update customers table
        const nameParts = name.trim().split(" ");
        const fname = nameParts[0] || name.trim();
        const lname = nameParts.slice(1).join(" ") || "";

        try {
          await d1Db
            .prepare(
              `INSERT INTO customers (id, fname, lname, email, phone, address, emirate, total_orders, total_spent, last_order_tracking, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
               ON CONFLICT(phone) DO UPDATE SET 
                 fname = excluded.fname,
                 lname = excluded.lname,
                 email = CASE WHEN excluded.email != '' THEN excluded.email ELSE customers.email END,
                 address = excluded.address,
                 emirate = excluded.emirate,
                 total_orders = customers.total_orders + 1,
                 total_spent = customers.total_spent + excluded.total_spent,
                 last_order_tracking = excluded.last_order_tracking`,
            )
            .bind(
              customerId,
              fname,
              lname,
              email?.trim() || "",
              phone.trim(),
              address.trim(),
              emirate.trim(),
              Number(total),
              tracking,
              createdAtStr,
            )
            .run();
        } catch (custErr) {
          console.warn("[D1 Customers Sync Warning]:", custErr);
        }
      } catch (err: any) {
        console.error("[D1 Insert Order Error]:", err);
        d1Error = err?.message || String(err);
      }
    }

    const orderResult = {
      id: orderId,
      tracking,
      name: name.trim(),
      email: email?.trim() || undefined,
      phone: phone.trim(),
      address: address.trim(),
      emirate: emirate.trim(),
      items,
      subtotal: Number(subtotal),
      deliveryFee: Number(deliveryFee),
      tax: tax !== undefined ? Number(tax) : undefined,
      taxRate: taxRate !== undefined ? Number(taxRate) : undefined,
      total: Number(total),
      status,
      paymentMethod,
      createdAt: new Date(createdAtStr).getTime(),
    };

    // Keep in local fallback cache
    localOrdersFallback.unshift(orderResult);

    return c.json({
      success: true,
      savedInD1,
      d1Error,
      order: orderResult,
    });
  } catch (err: any) {
    console.error("[POST /api/orders Error]:", err);
    return c.json({ success: false, error: err?.message || "Failed to save order" }, 500);
  }
});

// 2. GET /api/orders - Get all orders (for Admin Dashboard)
orderApi.get("/", async (c) => {
  try {
    const env = (c.env as any) || {};
    const d1Db = env.DB;

    if (d1Db && typeof d1Db.prepare === "function") {
      const { results } = await d1Db.prepare(`SELECT * FROM orders ORDER BY created_at DESC`).all();

      if (Array.isArray(results) && results.length > 0) {
        const orders = results.map(formatD1Order);
        return c.json({ success: true, source: "d1", orders });
      }
    }

    return c.json({ success: true, source: "local", orders: localOrdersFallback });
  } catch (err: any) {
    console.error("[GET /api/orders Error]:", err);
    return c.json({ success: true, source: "fallback", orders: localOrdersFallback });
  }
});

// 3. GET /api/orders/:tracking - Get order details by tracking number
orderApi.get("/:tracking", async (c) => {
  const tracking = c.req.param("tracking")?.trim().toUpperCase();
  if (!tracking) {
    return c.json({ success: false, error: "Tracking number is required" }, 400);
  }

  try {
    const env = (c.env as any) || {};
    const d1Db = env.DB;

    if (d1Db && typeof d1Db.prepare === "function") {
      const row = await d1Db
        .prepare(`SELECT * FROM orders WHERE UPPER(tracking_number) = ? OR UPPER(id) = ? LIMIT 1`)
        .bind(tracking, tracking)
        .first();

      if (row) {
        return c.json({ success: true, source: "d1", order: formatD1Order(row) });
      }
    }

    const localMatch = localOrdersFallback.find(
      (o) => o.tracking.toUpperCase() === tracking || o.id.toUpperCase() === tracking,
    );

    if (localMatch) {
      return c.json({ success: true, source: "local", order: localMatch });
    }

    return c.json({ success: false, error: "Order not found" }, 404);
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to fetch order" }, 500);
  }
});

// 4. PATCH /api/orders/:tracking/status - Update order status in D1
orderApi.patch("/:tracking/status", async (c) => {
  const tracking = c.req.param("tracking")?.trim().toUpperCase();
  const body = await c.req.json().catch(() => ({}));
  const { status } = body;

  if (!tracking || !status) {
    return c.json({ success: false, error: "Tracking and status required" }, 400);
  }

  try {
    const env = (c.env as any) || {};
    const d1Db = env.DB;

    if (d1Db && typeof d1Db.prepare === "function") {
      await d1Db
        .prepare(`UPDATE orders SET status = ? WHERE UPPER(tracking_number) = ? OR UPPER(id) = ?`)
        .bind(status, tracking, tracking)
        .run();
    }

    const localMatch = localOrdersFallback.find(
      (o) => o.tracking.toUpperCase() === tracking || o.id.toUpperCase() === tracking,
    );
    if (localMatch) {
      localMatch.status = status;
    }

    return c.json({ success: true, status });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to update status" }, 500);
  }
});
