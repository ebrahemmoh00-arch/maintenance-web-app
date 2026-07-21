export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function currentTimeValue() {
  return new Date().toTimeString().slice(0, 5);
}

export function createWorkOrderForm({
  equipment = [],
  customers = [],
  engineers = [],
  rows = []
} = {}) {
  return {
    customer_id: "",
    equipment_id: "",
    engineer_id: "",
    wo_no: getNextWorkOrderNo(rows, ""),
    shift_engineer_name: "",
    assigned_to: "",
    appointed_members_list: [""],
    task_description: "",
    service_hours: 0,
    serial_number: "",
    location: "",
    start_time: "",
    start_date: "",
    finished_time: "",
    finished_date: "",
    maintenance_type: "",
    executor_name: "",
    executor_job_title: "",
    status: "pending",
    priority: "medium",
    requirements: "",
    spare_parts: "",
    qhse_instructions: "",
    safety_responsible: "",
    site_preparation: "",
    holder_name: "",
    holder_job_title: "",
    recommendation: "",
    executive_name: "",
    manager_name: "",
    spare_parts_items: [{
      name: "",
      qty: 1
    }],
    signature_executor: "",
    signature_shift_engineer: "",
    signature_manager: "",
    before_photos: [],
    after_photos: []
  };
}

export function formFromSavedOrder(order, equipment, customers, engineers) {
  const meta = parseWorkOrderNotes(order.notes);
  const asset = equipment.find(item => Number(item.id) === Number(order.equipment_id));
  const customer = customers.find(item => Number(item.id) === Number(order.customer_id));
  const engineer = engineers.find(item => Number(item.id) === Number(order.engineer_id));
  return {
    ...createWorkOrderForm({
      equipment,
      customers,
      engineers
    }),
    ...meta,
    customer_id: order.customer_id || customer?.id || "",
    equipment_id: order.equipment_id || asset?.id || "",
    engineer_id: order.engineer_id || engineer?.id || "",
    shift_engineer_name: meta.shift_engineer_name || engineer?.name || order.engineer_name || "",
    appointed_members_list: Array.isArray(meta.appointed_members_list) && meta.appointed_members_list.length ? meta.appointed_members_list : splitLines(meta.appointed_members),
    task_description: meta.task_description || order.description || "",
    service_hours: Number(order.service_hours || asset?.current_hours || 0),
    serial_number: meta.serial_number || asset?.serial_number || "",
    location: meta.location || asset?.location || customer?.name || "",
    start_date: meta.start_date || order.scheduled_date || todayIso(),
    finished_date: meta.finished_date || order.due_date || order.scheduled_date || todayIso(),
    status: order.status || meta.status || "pending",
    priority: order.priority || meta.priority || "medium"
  };
}

export function parseWorkOrderNotes(notes) {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    return parsed && parsed.__workOrderDocument ? parsed : {};
  } catch {
    return {};
  }
}

export function getWorkOrderSavedDate(row) {
  const meta = parseWorkOrderNotes(row.notes);
  return meta.start_date || row.scheduled_date || row.created_at?.slice(0, 10) || row.due_date || "";
}

export function splitLines(value) {
  const lines = String(value || "").split(/\r?\n/).map(line => line.replace(/^\s*\d+[\-.)]\s*/, "").trim()).filter(Boolean);
  return lines.length ? lines : [""];
}

export function getNextWorkOrderNo(rows, equipmentId) {
  const matchingRows = rows.filter(row => Number(row.equipment_id) === Number(equipmentId));
  const highest = matchingRows.reduce((max, row) => {
    const meta = parseWorkOrderNotes(row.notes);
    const number = Number.parseInt(meta.wo_no || String(meta.wo_reference || row.title || "").match(/-(\d{1,})\b/)?.[1] || "0", 10);
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);
  return String(highest + 1).padStart(4, "0");
}

export function buildWorkOrderReference(form, customer, equipmentItem) {
  const customerName = customer?.name || form.location || "Location";
  const assetName = equipmentItem?.name || "Asset";
  return `${customerName} ${assetName} -${form.wo_no || "0000"}`.replace(/\s+/g, " ").trim();
}

export function buildWorkOrderPdfFileName(form, customer, equipmentItem, savedOrder) {
  const savedMeta = savedOrder ? parseWorkOrderNotes(savedOrder.notes) : {};
  const siteName = customer?.name || savedOrder?.customer_name || savedMeta.location || form.location || "Location";
  const assetName = equipmentItem?.name || savedOrder?.equipment_name || "Asset";
  const savedNo = String(savedMeta.wo_reference || savedOrder?.title || "").match(/-(\d{1,})\b/)?.[1] || "";
  const woNo = String(form.wo_no || savedMeta.wo_no || savedNo || "0000").replace(/^-+/, "");
  return sanitizePdfFileName(`${siteName} ${assetName} -${woNo}`.replace(/\s+/g, " ").trim());
}

export function sanitizePdfFileName(value) {
  return String(value || "Work Order").replace(/[<>:"/\\|?*\x00-\x1F]/g, "-").replace(/\s+/g, " ").trim().slice(0, 120) || "Work Order";
}

export function calculateDuration(start, end) {
  if (!start || !end) return "0:00";
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  if ([startHour, startMinute, endHour, endMinute].some(value => Number.isNaN(value))) return "0:00";
  let minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  if (minutes < 0) minutes += 24 * 60;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}:${String(rest).padStart(2, "0")}`;
}

export function formatShortDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "2-digit"
  }).replace(/ /g, "-");
}

export function formatTimeDisplay(value) {
  if (!value) return "--:--";
  const [hourText, minuteText] = value.split(":");
  let hour = Number(hourText);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${String(hour).padStart(2, "0")}:${minuteText || "00"} ${suffix}`;
}

export function splitTime12(value) {
  if (!value) return {
    hour: "12",
    minute: "00",
    period: "AM"
  };
  const [hourText, minuteText = "00"] = value.split(":");
  const hour24 = Number(hourText);
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 || 12;
  return {
    hour: String(hour).padStart(2, "0"),
    minute: minuteText.padStart(2, "0"),
    period
  };
}

export function joinTime12({
  hour,
  minute,
  period
}) {
  let nextHour = Number(hour);
  if (period === "PM" && nextHour !== 12) nextHour += 12;
  if (period === "AM" && nextHour === 12) nextHour = 0;
  return `${String(nextHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function notifyManagerApproval(t) {
  const message = t("Manager approval notification sent");
  if (!("Notification" in window)) {
    window.alert(`${message}. ${t("Browser notifications are not enabled.")}`);
    return;
  }
  if (Notification.permission === "granted") {
    new Notification(message, {
      body: "A completed work order is waiting for approval."
    });
    return;
  }
  if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification(message, {
          body: "A completed work order is waiting for approval."
        });
      } else {
        window.alert(message);
      }
    });
    return;
  }
  window.alert(message);
}
