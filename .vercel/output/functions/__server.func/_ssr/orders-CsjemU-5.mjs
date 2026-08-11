import { t as supabase } from "./client-DyoxjvoX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/orders-CsjemU-5.js
var STATUS_STEPS = [
	{
		key: "pending",
		label: "بانتظار الدفع"
	},
	{
		key: "paid",
		label: "تم الدفع"
	},
	{
		key: "processing",
		label: "قيد التجهيز"
	},
	{
		key: "shipped",
		label: "تم الشحن"
	},
	{
		key: "delivered",
		label: "تم التوصيل"
	}
];
function statusIndex(status) {
	const idx = STATUS_STEPS.findIndex((s) => s.key === status);
	return idx === -1 ? 0 : idx;
}
function isCancelled(status) {
	return status === "cancelled";
}
function formatDateTime(ts) {
	return new Date(ts).toLocaleString("ar", {
		dateStyle: "medium",
		timeStyle: "short"
	});
}
function getTimeline(order) {
	if (order.status === "cancelled") return [{
		label: "تم استلام الطلب",
		at: order.createdAt,
		reached: true
	}, {
		label: "تم إلغاء الطلب",
		at: order.createdAt,
		reached: true
	}];
	const reached = statusIndex(order.status);
	return STATUS_STEPS.map((step, idx) => ({
		label: step.label,
		at: idx === 0 ? order.createdAt : idx <= reached ? order.createdAt : null,
		reached: idx <= reached
	}));
}
function generateTracking() {
	const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
	return `TL-${Date.now().toString().slice(-4)}${rand}`;
}
function rowToOrder(r) {
	return {
		id: r.id,
		tracking: r.tracking,
		name: r.customer_name,
		phone: r.phone,
		address: r.address,
		emirate: r.emirate,
		items: Array.isArray(r.items) ? r.items : [],
		subtotal: Number(r.subtotal),
		deliveryFee: Number(r.delivery_fee),
		total: Number(r.total),
		status: r.status ?? "pending",
		createdAt: new Date(r.created_at).getTime(),
		paidAt: r.paid_at ? new Date(r.paid_at).getTime() : void 0,
		ziinaPaymentId: r.ziina_payment_id ?? void 0
	};
}
var LOCAL_ORDERS_KEY = "local_stored_orders";
function getLocalOrders() {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(LOCAL_ORDERS_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}
function saveLocalOrder(order) {
	if (typeof window === "undefined") return;
	const list = getLocalOrders();
	const index = list.findIndex((o) => o.id === order.id || o.tracking === order.tracking);
	if (index >= 0) list[index] = order;
	else list.unshift(order);
	window.localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(list));
}
async function createOrder(input) {
	const tracking = generateTracking();
	const payload = {
		tracking,
		customer_name: input.name,
		phone: input.phone,
		address: input.address,
		emirate: input.emirate,
		subtotal: input.subtotal,
		delivery_fee: input.deliveryFee,
		total: input.total,
		status: "pending",
		items: input.items.map((i) => ({
			id: i.product.id,
			name: i.product.name,
			price: i.product.price,
			qty: i.qty
		}))
	};
	const localOrder = {
		id: `ord-${Date.now()}`,
		tracking,
		name: input.name,
		phone: input.phone,
		address: input.address,
		emirate: input.emirate,
		items: input.items.map((i) => ({
			id: i.product.id,
			name: i.product.name,
			price: i.product.price,
			qty: i.qty
		})),
		subtotal: input.subtotal,
		deliveryFee: input.deliveryFee,
		total: input.total,
		status: "pending",
		createdAt: Date.now()
	};
	try {
		const { data, error } = await supabase.from("orders").insert(payload).select("*").single();
		if (error) throw error;
		const order = rowToOrder(data);
		saveLocalOrder(order);
		rememberMyTracking(order.tracking);
		return order;
	} catch (err) {
		console.warn("[Orders] Supabase order creation failed, using local storage fallback:", err);
		saveLocalOrder(localOrder);
		rememberMyTracking(localOrder.tracking);
		return localOrder;
	}
}
var MY_ORDERS_KEY = "my_order_trackings";
function getMyTrackings() {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(MY_ORDERS_KEY);
		const arr = raw ? JSON.parse(raw) : [];
		return Array.isArray(arr) ? arr.filter((v) => typeof v === "string") : [];
	} catch {
		return [];
	}
}
function rememberMyTracking(tracking) {
	if (typeof window === "undefined") return;
	const list = getMyTrackings();
	if (!list.includes(tracking)) {
		list.unshift(tracking);
		window.localStorage.setItem(MY_ORDERS_KEY, JSON.stringify(list.slice(0, 200)));
	}
}
async function getMyOrders() {
	const trackings = getMyTrackings();
	if (trackings.length === 0) return [];
	try {
		const { data, error } = await supabase.from("orders").select("*").in("tracking", trackings).order("created_at", { ascending: false });
		if (error) throw error;
		if (data && data.length > 0) return (data ?? []).map((r) => rowToOrder(r));
	} catch (err) {
		console.warn("[Orders] Supabase getMyOrders failed, using local orders fallback:", err);
	}
	return getLocalOrders().filter((o) => trackings.includes(o.tracking));
}
async function findOrder(tracking) {
	const normalized = tracking.trim().toUpperCase();
	try {
		const { data, error } = await supabase.from("orders").select("*").eq("tracking", normalized).maybeSingle();
		if (error) throw error;
		if (data) return rowToOrder(data);
	} catch (err) {
		console.warn("[Orders] Supabase findOrder failed, checking local orders:", err);
	}
	return getLocalOrders().find((o) => o.tracking.toUpperCase() === normalized) || null;
}
async function getAllOrders() {
	try {
		const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
		if (error) throw error;
		if (data) return (data ?? []).map((r) => rowToOrder(r));
	} catch (err) {
		console.warn("[Orders] Supabase getAllOrders failed, using local orders:", err);
	}
	return getLocalOrders();
}
//#endregion
export { getAllOrders as a, isCancelled as c, formatDateTime as i, statusIndex as l, createOrder as n, getMyOrders as o, findOrder as r, getTimeline as s, STATUS_STEPS as t };
