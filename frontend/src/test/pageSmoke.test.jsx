import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CMMSContext } from "../app/context/CMMSContext.jsx";
import { LoginForm } from "../features/authentication/components/LoginForm.jsx";
import DashboardPage from "../features/dashboard/pages/DashboardPage.jsx";
import AssetsPage from "../features/assets/pages/AssetsPage.jsx";
import WorkOrdersPage from "../features/work-orders/pages/WorkOrdersPage.jsx";
import PMPlansPage from "../features/pm/pages/PMPlansPage.jsx";
import ReportsPage from "../features/reports/pages/ReportsPage.jsx";

vi.mock("../features/dashboard/components/DashboardCore.jsx", () => ({
  Dashboard: ({ stats, data, alerts, openCreate }) => (
    <section aria-label="dashboard-page">
      <h1>Dashboard Test Shell</h1>
      <span>Total assets: {stats.total_assets}</span>
      <span>Assets loaded: {data.equipment.length}</span>
      <span>Alerts loaded: {alerts.length}</span>
      <button type="button" onClick={() => openCreate("work-orders")}>Create from dashboard</button>
    </section>
  )
}));

vi.mock("../features/dashboard/utils/maintenanceMetrics.jsx", () => ({
  SkeletonDashboard: () => <div>Dashboard Loading</div>
}));

vi.mock("../features/assets/components/AssetsView.jsx", () => ({
  AssetsView: ({ rows, departments, onCreate, onEdit, canCreateAsset }) => (
    <section aria-label="assets-page">
      <h1>Assets Test Shell</h1>
      <span>Asset rows: {rows.length}</span>
      <span>Departments: {departments.length}</span>
      <span>Create allowed: {String(canCreateAsset)}</span>
      <button type="button" onClick={onCreate}>Create Asset</button>
      <button type="button" onClick={() => onEdit(rows[0])}>Edit First Asset</button>
    </section>
  )
}));

vi.mock("../features/work-orders/components/WorkOrdersView.jsx", () => ({
  WorkOrdersView: ({ rows, engineers, inventory, onSave, onLifecycleAction, canCreate }) => (
    <section aria-label="work-orders-page">
      <h1>Work Orders Test Shell</h1>
      <span>Work order rows: {rows.length}</span>
      <span>Engineers: {engineers.length}</span>
      <span>Inventory: {inventory.length}</span>
      <span>Create allowed: {String(canCreate)}</span>
      <button type="button" onClick={() => onSave({ id: rows[0]?.id })}>Save Work Order</button>
      <button type="button" onClick={() => onLifecycleAction(rows[0]?.id, "start")}>Start Work Order</button>
    </section>
  )
}));

vi.mock("../features/reports/components/ReportsView.jsx", () => ({
  Reports: ({ data, alerts, stats, mode }) => (
    <section aria-label="reports-page">
      <h1>Reports Test Shell</h1>
      <span>Mode: {mode}</span>
      <span>Report assets: {data.equipment.length}</span>
      <span>Report alerts: {alerts.length}</span>
      <span>Total orders: {stats.total_orders}</span>
    </section>
  )
}));

function buildData() {
  return {
    customers: [{ id: 1, name: "Gabal Elasfar Power Plant" }],
    equipment: [
      { id: 1, customer_id: 1, name: "M01", asset_type: "Generator", status: "Running", current_hours: 4928 },
      { id: 2, customer_id: 1, name: "M02", asset_type: "Generator", status: "Running", current_hours: 4010 }
    ],
    engineers: [
      { id: 1, name: "Ebrahim Mohamed", role: "engineer", job_title: "Shift Engineer" },
      { id: 2, name: "Ezzat Ragab", role: "technician", job_title: "Senior Technician" }
    ],
    inventory: [{ id: 1, name: "Oil Filter", stock_quantity: 4, minimum_quantity: 2 }],
    "work-orders": [
      {
        id: 1,
        title: "Oil Sample",
        description: "Take an oil sample.",
        customer_id: 1,
        equipment_id: 1,
        engineer_id: 1,
        status: "assigned",
        priority: "High",
        scheduled_date: "2026-07-20",
        equipment_name: "M01",
        customer_name: "Gabal Elasfar Power Plant",
        engineer_name: "Ebrahim Mohamed"
      }
    ],
    "preventive-maintenance": [
      { id: 1, equipment_id: 1, task_name: "Oil Sample", interval_hours: 500, status: "active" }
    ],
    "pm-plans": [
      {
        id: 1,
        equipment_id: 1,
        equipment_name: "M01",
        customer_id: 1,
        customer_name: "Gabal Elasfar Power Plant",
        name: "Oil Sample",
        priority: "High",
        recurrence_type: "Runtime Hours",
        interval_value: 500,
        status: "active",
        next_due_runtime: 5500
      }
    ]
  };
}

function buildContext(overrides = {}) {
  const data = buildData();
  return {
    loading: false,
    stats: {
      total_assets: 2,
      total_orders: 1,
      pending_orders: 1,
      completed_orders: 0
    },
    displayData: data,
    data,
    alerts: [{ id: 1, equipment_name: "M01", alert_level: "UPCOMING" }],
    backendReliability: {},
    openCreate: vi.fn(),
    openEdit: vi.fn(),
    deleteRecord: vi.fn(),
    moveAsset: vi.fn(),
    saveWorkOrderDocument: vi.fn(),
    runWorkOrderLifecycleAction: vi.fn(),
    runPMScheduler: vi.fn(),
    setActive: vi.fn(),
    language: "en",
    dashboardAlertsOpen: false,
    setDashboardAlertsOpen: vi.fn(),
    employeeRows: data.engineers,
    canModifyWorkOrders: true,
    canAddWorkOrders: true,
    currentUser: { id: 1, name: "System Administrator", role: "admin", permissions: "" },
    page: "reports",
    ...overrides
  };
}

function renderWithCMMS(ui, overrides = {}) {
  const context = buildContext(overrides);
  render(
    <CMMSContext.Provider value={context}>
      {ui}
    </CMMSContext.Provider>
  );
  return context;
}

function LoginHarness({ onSubmit = vi.fn() }) {
  const [value, setValue] = useState({ username: "", password: "" });
  const labels = {
    "auth.method.password": "Password Login",
    "auth.username.label": "Username / Email",
    "auth.username.placeholder": "Enter username",
    "auth.password.label": "Password",
    "auth.password.placeholder": "Enter password",
    "auth.password.show": "Show password",
    "auth.password.hide": "Hide password",
    "auth.validation.username": "Username is required",
    "auth.validation.password": "Password is required",
    "auth.remember": "Remember me",
    "auth.forgot": "Forgot password",
    "auth.forgot.disabled": "Forgot password is disabled",
    "auth.submit": "Sign In",
    "auth.submit.loading": "Signing in",
    "auth.error.server": "Server unavailable",
    "auth.error.invalid": "Invalid username or password",
    "auth.capsLock": "Caps Lock is on"
  };
  const t = key => labels[key] || key;
  return <LoginForm value={value} setValue={setValue} error="" onSubmit={onSubmit} t={t} />;
}

describe("frontend page foundation", () => {
  it("validates and submits the login form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginHarness onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Sign In" }));
    expect(screen.getByText("Username is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Username / Email"), "admin");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it("renders dashboard data and wires the create action", async () => {
    const user = userEvent.setup();
    const context = renderWithCMMS(<DashboardPage />);

    expect(screen.getByRole("region", { name: "dashboard-page" })).toBeInTheDocument();
    expect(screen.getByText("Total assets: 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create from dashboard" }));
    expect(context.openCreate).toHaveBeenCalledWith("work-orders");
  });

  it("renders assets data and wires create/edit actions", async () => {
    const user = userEvent.setup();
    const context = renderWithCMMS(<AssetsPage />);

    expect(screen.getByRole("region", { name: "assets-page" })).toBeInTheDocument();
    expect(screen.getByText("Asset rows: 2")).toBeInTheDocument();
    expect(screen.getByText("Create allowed: true")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create Asset" }));
    await user.click(screen.getByRole("button", { name: "Edit First Asset" }));
    expect(context.openCreate).toHaveBeenCalledWith("equipment");
    expect(context.openEdit).toHaveBeenCalledWith("equipment", expect.objectContaining({ name: "M01" }));
  });

  it("renders work orders and wires save/lifecycle actions", async () => {
    const user = userEvent.setup();
    const context = renderWithCMMS(<WorkOrdersPage />);

    expect(screen.getByRole("region", { name: "work-orders-page" })).toBeInTheDocument();
    expect(screen.getByText("Work order rows: 1")).toBeInTheDocument();
    expect(screen.getByText("Engineers: 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save Work Order" }));
    await user.click(screen.getByRole("button", { name: "Start Work Order" }));
    expect(context.saveWorkOrderDocument).toHaveBeenCalledWith({ id: 1 });
    expect(context.runWorkOrderLifecycleAction).toHaveBeenCalledWith(1, "start");
  });

  it("renders PM Plans grouped by selected customer/site", async () => {
    const context = renderWithCMMS(<PMPlansPage />);

    expect((await screen.findAllByText("Gabal Elasfar Power Plant")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("PM Plans").length).toBeGreaterThan(0);
    expect(screen.getByText("Oil Sample")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "New Record" }));
    expect(context.openCreate).toHaveBeenCalledWith("pm-plans");
  });

  it("renders reports in reports mode", () => {
    renderWithCMMS(<ReportsPage />, { page: "reports" });

    expect(screen.getByRole("region", { name: "reports-page" })).toBeInTheDocument();
    expect(screen.getByText("Mode: reports")).toBeInTheDocument();
    expect(screen.getByText("Report assets: 2")).toBeInTheDocument();
  });
});
