import { tr } from "../../../shared/config/appConfig.jsx";
import { buildWorkOrderPdfFileName, buildWorkOrderReference, calculateDuration, createWorkOrderForm, formFromSavedOrder, getNextWorkOrderNo, getWorkOrderSavedDate, notifyManagerApproval, todayIso } from "../utils/workOrderForms.js";
import { normalizeWorkOrderStatus } from "../utils/workOrderStatus.js";
import { lifecycleActionsForStatus } from "./WorkOrderDocumentParts.jsx";
import { WorkOrdersWorkspace } from "./WorkOrdersWorkspace.jsx";
import { Activity, Box, CheckCircle2, Clock3, MessageSquare, Paperclip, TimerReset } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export const DOCUMENT_CODE = "WO-GEN-F-001";

export const ISSUE_NO = "1";

export const ISSUE_DATE = "2-Jul-26";

export function WorkOrdersView({
  rows,
  customers,
  equipment,
  engineers,
  onSave,
  onDelete,
  onLifecycleAction,
  onBackToEquipment,
  canManage,
  canCreate = canManage,
  canEdit = canManage,
  canDelete = canManage,
  language
}) {
  const t = text => tr(language, text);
  const [selectedSavedId, setSelectedSavedId] = useState(rows[0]?.id || "");
  const [savedFilter, setSavedFilter] = useState({
    equipmentId: "",
    date: ""
  });
  const [editingId, setEditingId] = useState(null);
  const [viewingSavedId, setViewingSavedId] = useState(null);
  const [form, setForm] = useState(() => createWorkOrderForm({
    equipment,
    customers,
    engineers,
    rows
  }));
  const [activeWorkOrderTab, setActiveWorkOrderTab] = useState("overview");
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrMessage, setQrMessage] = useState("");
  const [lifecycleDraft, setLifecycleDraft] = useState({
    engineer_id: "",
    runtime_reading: "",
    notes: "",
    reason: "",
    completion_notes: "",
    supervisor_notes: "",
    checklist_completed: false
  });
  const workOrderSectionRef = useRef(null);
  const videoRef = useRef(null);
  const qrStreamRef = useRef(null);
  const selectedEquipment = equipment.find(item => Number(item.id) === Number(form.equipment_id));
  const selectedCustomer = customers.find(item => Number(item.id) === Number(form.customer_id));
  const selectedEngineer = engineers.find(item => Number(item.id) === Number(form.engineer_id));
  const filteredEquipment = form.customer_id ? equipment.filter(item => Number(item.customer_id) === Number(form.customer_id)) : [];
  const woReference = buildWorkOrderReference(form, selectedCustomer, selectedEquipment);
  const duration = calculateDuration(form.start_time, form.finished_time);
  const savedEquipmentOptions = useMemo(() => {
    const usedEquipmentIds = new Set(rows.map(row => Number(row.equipment_id)).filter(Boolean));
    return equipment.filter(item => usedEquipmentIds.has(Number(item.id))).slice().sort((first, second) => `${first.customer_name || ""} ${first.name || ""}`.localeCompare(`${second.customer_name || ""} ${second.name || ""}`));
  }, [rows, equipment]);
  const savedRowsByEquipment = useMemo(() => {
    if (!savedFilter.equipmentId) return rows;
    return rows.filter(row => Number(row.equipment_id) === Number(savedFilter.equipmentId));
  }, [rows, savedFilter.equipmentId]);
  const savedDateOptions = useMemo(() => Array.from(new Set(savedRowsByEquipment.map(getWorkOrderSavedDate).filter(Boolean))).sort().reverse(), [savedRowsByEquipment]);
  const filteredSavedRows = useMemo(() => {
    if (!savedFilter.date) return savedRowsByEquipment;
    return savedRowsByEquipment.filter(row => getWorkOrderSavedDate(row) === savedFilter.date);
  }, [savedRowsByEquipment, savedFilter.date]);
  const selectedSavedOrder = rows.find(row => Number(row.id) === Number(selectedSavedId));
  useEffect(() => {
    if (!form.equipment_id && !form.customer_id && !rows.length && !equipment.length) {
      setForm(createWorkOrderForm({
        equipment,
        customers,
        engineers,
        rows
      }));
    }
  }, [equipment, customers, engineers]);
  useEffect(() => {
    if (filteredSavedRows.length && !filteredSavedRows.some(row => Number(row.id) === Number(selectedSavedId))) {
      setSelectedSavedId(filteredSavedRows[0].id);
    }
    if (!filteredSavedRows.length && selectedSavedId) {
      setSelectedSavedId("");
    }
  }, [filteredSavedRows, selectedSavedId]);
  useEffect(() => () => {
    qrStreamRef.current?.getTracks().forEach(track => track.stop());
  }, []);
  function update(key, value) {
    setForm(current => ({
      ...current,
      [key]: value
    }));
  }
  function chooseCustomer(value) {
    setForm(current => {
      const currentAsset = equipment.find(item => Number(item.id) === Number(current.equipment_id));
      const assetStillMatches = currentAsset && Number(currentAsset.customer_id) === Number(value);
      return {
        ...current,
        customer_id: value,
        equipment_id: assetStillMatches ? current.equipment_id : "",
        service_hours: assetStillMatches ? Number(currentAsset.current_hours || 0) : 0,
        serial_number: assetStillMatches ? currentAsset.serial_number || "" : "",
        location: assetStillMatches ? currentAsset.location || "" : "",
        wo_no: assetStillMatches ? getNextWorkOrderNo(rows, current.equipment_id) : getNextWorkOrderNo(rows, "")
      };
    });
  }
  function chooseEquipment(value) {
    const asset = equipment.find(item => Number(item.id) === Number(value));
    if (!value || !asset) {
      setForm(current => ({
        ...current,
        equipment_id: "",
        service_hours: 0,
        serial_number: "",
        location: "",
        wo_no: getNextWorkOrderNo(rows, "")
      }));
      return;
    }
    setForm(current => ({
      ...current,
      equipment_id: value,
      customer_id: asset?.customer_id || current.customer_id,
      service_hours: Number(asset?.current_hours || 0),
      serial_number: asset?.serial_number || "",
      location: asset?.location || "",
      wo_no: getNextWorkOrderNo(rows, value)
    }));
  }
  function updateMember(index, value) {
    setForm(current => ({
      ...current,
      appointed_members_list: current.appointed_members_list.map((item, itemIndex) => itemIndex === index ? value : item)
    }));
  }
  function addMember() {
    setForm(current => ({
      ...current,
      appointed_members_list: [...current.appointed_members_list, ""]
    }));
  }
  function updateSparePart(index, patch) {
    setForm(current => ({
      ...current,
      spare_parts_items: current.spare_parts_items.map((item, itemIndex) => itemIndex === index ? {
        ...item,
        ...patch
      } : item)
    }));
  }
  function addSparePart() {
    setForm(current => ({
      ...current,
      spare_parts_items: [...current.spare_parts_items, {
        name: "",
        qty: 1
      }]
    }));
  }
  function updatePhotos(key, photos) {
    setForm(current => ({
      ...current,
      [key]: photos
    }));
  }
  function updateSignature(key, value) {
    setForm(current => ({
      ...current,
      [key]: value
    }));
  }
  async function openQrScanner() {
    setQrOpen(true);
    setQrMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setQrMessage("Camera is not available in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment"
        }
      });
      qrStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanQrFrame();
    } catch {
      setQrMessage("Camera permission was not granted.");
    }
  }
  function closeQrScanner() {
    qrStreamRef.current?.getTracks().forEach(track => track.stop());
    qrStreamRef.current = null;
    setQrOpen(false);
  }
  async function scanQrFrame() {
    if (!("BarcodeDetector" in window)) {
      setQrMessage("BarcodeDetector is not supported. Select equipment manually.");
      return;
    }
    const detector = new window.BarcodeDetector({
      formats: ["qr_code", "code_128", "code_39"]
    });
    const loop = async () => {
      if (!qrStreamRef.current || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length) {
          const raw = codes[0].rawValue;
          const asset = equipment.find(item => [String(item.id), item.name, item.serial_number].filter(Boolean).some(value => raw.includes(String(value))));
          if (asset) {
            chooseEquipment(asset.id);
            closeQrScanner();
            return;
          }
          setQrMessage(`Scanned: ${raw}`);
        }
      } catch {
        setQrMessage("Unable to scan this frame.");
      }
      window.setTimeout(loop, 700);
    };
    loop();
  }
  function newWorkOrder() {
    setEditingId(null);
    setViewingSavedId(null);
    setForm(createWorkOrderForm({
      equipment,
      customers,
      engineers,
      rows
    }));
  }
  function openSelected(id = selectedSavedId) {
    const selected = rows.find(row => Number(row.id) === Number(id));
    if (!selected) return;
    setSelectedSavedId(selected.id);
    setEditingId(null);
    setViewingSavedId(selected.id);
    setForm(formFromSavedOrder(selected, equipment, customers, engineers));
    window.requestAnimationFrame(() => {
      workOrderSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }
  function editSelected() {
    if (!canEdit) return;
    const selected = rows.find(row => Number(row.id) === Number(selectedSavedId));
    if (!selected) return;
    setViewingSavedId(null);
    setEditingId(selected.id);
    setForm(formFromSavedOrder(selected, equipment, customers, engineers));
    window.requestAnimationFrame(() => {
      workOrderSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }
  async function deleteSelected() {
    if (!canDelete) return;
    if (!selectedSavedId) return;
    const confirmed = window.confirm(language === "ar" ? "هل تريد حذف أمر العمل المحدد؟" : "Delete the selected work order?");
    if (!confirmed) return;
    await onDelete(selectedSavedId);
    setEditingId(null);
    setViewingSavedId(null);
    setSelectedSavedId("");
  }
  async function runLifecycle(action) {
    if (!selectedSavedOrder || !onLifecycleAction) return;
    const payload = {
      ...lifecycleDraft,
      engineer_id: lifecycleDraft.engineer_id ? Number(lifecycleDraft.engineer_id) : Number(selectedSavedOrder.engineer_id || form.engineer_id || 0),
      runtime_reading: lifecycleDraft.runtime_reading === "" ? Number(selectedSavedOrder.service_hours || form.service_hours || 0) : Number(lifecycleDraft.runtime_reading),
      notes: lifecycleDraft.notes,
      reason: lifecycleDraft.reason,
      completion_notes: lifecycleDraft.completion_notes || lifecycleDraft.notes,
      supervisor_notes: lifecycleDraft.supervisor_notes || lifecycleDraft.notes,
      checklist_completed: Boolean(lifecycleDraft.checklist_completed)
    };
    const ok = await onLifecycleAction(selectedSavedOrder.id, action, payload);
    if (ok) {
      setLifecycleDraft(current => ({
        ...current,
        notes: "",
        reason: "",
        completion_notes: "",
        supervisor_notes: "",
        checklist_completed: false
      }));
    }
  }
  async function saveWorkOrder() {
    if (viewingSavedId && !editingId) return;
    if (editingId && !canEdit) return;
    if (!editingId && !canCreate) return;
    if (!form.customer_id || !form.equipment_id || !form.engineer_id) {
      window.alert(language === "ar" ? "اختر العميل والمعدة ومهندس الوردية قبل الحفظ." : "Select customer, equipment, and shift engineer before saving.");
      return;
    }
    const serviceHours = Number(selectedEquipment?.current_hours ?? form.service_hours ?? 0);
    const taskDescription = form.task_description?.trim() || "Maintenance work order";
    const payload = {
      title: `${woReference} - ${taskDescription}`.trim(),
      description: taskDescription,
      customer_id: Number(form.customer_id),
      equipment_id: Number(form.equipment_id),
      engineer_id: Number(form.engineer_id),
      scheduled_date: form.start_date || todayIso(),
      due_date: form.finished_date || form.start_date || todayIso(),
      status: form.status,
      priority: form.priority,
      service_hours: serviceHours,
      notes: JSON.stringify({
        __workOrderDocument: true,
        ...form,
        service_hours: serviceHours,
        wo_reference: woReference,
        document_code: DOCUMENT_CODE,
        issue_no: ISSUE_NO,
        issue_date: ISSUE_DATE,
        duration,
        inventory_deducted_at: form.status === "completed" ? new Date().toISOString() : form.inventory_deducted_at || ""
      })
    };
    const wasEditing = Boolean(editingId);
    const saved = await onSave(payload, editingId);
    if (saved) {
      if (form.status === "completed") {
        notifyManagerApproval(t);
      }
      setEditingId(null);
      if (!wasEditing) {
        setViewingSavedId(null);
        setForm(current => ({
          ...current,
          wo_no: String(Number(current.wo_no || 0) + 1).padStart(4, "0")
        }));
      }
    }
  }
  function exportWorkOrderPdf() {
    if (selectedSavedOrder) {
      const exportForm = formFromSavedOrder(selectedSavedOrder, equipment, customers, engineers);
      const exportCustomer = customers.find(item => Number(item.id) === Number(exportForm.customer_id));
      const exportEquipment = equipment.find(item => Number(item.id) === Number(exportForm.equipment_id));
      const pdfTitle = buildWorkOrderPdfFileName(exportForm, exportCustomer, exportEquipment, selectedSavedOrder);
      setEditingId(selectedSavedOrder.id);
      setForm(exportForm);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => printWorkOrderPdf(pdfTitle));
      });
      return;
    }
    const pdfTitle = buildWorkOrderPdfFileName(form, selectedCustomer, selectedEquipment, null);
    printWorkOrderPdf(pdfTitle);
  }
  function printWorkOrderPdf(pdfTitle) {
    const previousTitle = document.title;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };
    document.title = pdfTitle;
    window.addEventListener("afterprint", restoreTitle, {
      once: true
    });
    window.print();
    window.setTimeout(restoreTitle, 30000);
  }
  const activeSavedOrder = viewingSavedId || editingId ? selectedSavedOrder : null;
  const currentStatus = normalizeWorkOrderStatus(activeSavedOrder?.status || form.status);
  const lifecycleActions = lifecycleActionsForStatus(currentStatus);
  const canRunAction = Boolean(activeSavedOrder && canEdit);
  const actionKeys = new Set(lifecycleActions.map(action => action.key));
  const quickAssignedTo = form.assigned_to || selectedEngineer?.name || activeSavedOrder?.engineer_name || "-";
  const checklistProgress = activeSavedOrder?.checklist_completed || lifecycleDraft.checklist_completed ? 100 : 0;
  const partsTotal = (form.spare_parts_items || []).reduce((total, item) => total + Number(item.total || item.cost || 0), 0);
  const estimatedHours = duration && duration !== "0:00" ? duration : form.estimated_hours || "-";
  const smartAlerts = [!form.after_photos?.length ? "No after-maintenance photos" : "", checklistProgress < 100 ? "Checklist is not complete" : "", !form.signature_executor ? "Technician signature is missing" : "", !(form.spare_parts_items || []).some(item => item.name) ? "No spare parts recorded" : ""].filter(Boolean);
  const workOrderTabs = [["overview", "Overview", Activity], ["checklist", "Checklist", CheckCircle2], ["labor", "Labor & Time", Clock3], ["parts", "Parts", Box], ["attachments", "Attachments", Paperclip], ["history", "History", TimerReset], ["notes", "Notes", MessageSquare]];
  const app = {
    t,
    workOrderSectionRef,
    selectedEquipment,
    selectedCustomer,
    form,
    woReference,
    currentStatus,
    language,
    quickAssignedTo,
    viewingSavedId,
    canRunAction,
    actionKeys,
    runLifecycle,
    moreActionsOpen,
    setMoreActionsOpen,
    exportWorkOrderPdf,
    qrOpen,
    closeQrScanner,
    openQrScanner,
    onBackToEquipment,
    editingId,
    canEdit,
    canCreate,
    saveWorkOrder,
    filteredEquipment,
    customers,
    chooseCustomer,
    chooseEquipment,
    engineers,
    setForm,
    videoRef,
    qrMessage,
    estimatedHours,
    smartAlerts,
    workOrderTabs,
    activeWorkOrderTab,
    setActiveWorkOrderTab,
    update,
    updatePhotos,
    lifecycleDraft,
    setLifecycleDraft,
    checklistProgress,
    duration,
    selectedEngineer,
    updateSparePart,
    addSparePart,
    partsTotal,
    updateSignature,
    activeSavedOrder,
    updateMember,
    addMember,
    selectedSavedId,
    openSelected,
    editSelected,
    deleteSelected,
    canDelete,
    newWorkOrder,
    savedEquipmentOptions,
    savedDateOptions,
    savedFilter,
    setSavedFilter,
    filteredSavedRows,
    setSelectedSavedId,
    DOCUMENT_CODE,
    ISSUE_NO,
    ISSUE_DATE
  };

  return <WorkOrdersWorkspace app={app} />;
}
