import { useCMMS } from "../../../app/context/CMMSContext.jsx";
import { Reports } from "../components/ReportsView.jsx";

export default function ReportsPage() {
  const {
    data,
    alerts,
    stats,
    language,
    currentUser,
    page
  } = useCMMS();

  return (
    <Reports
      data={data}
      alerts={alerts}
      stats={stats}
      language={language}
      currentUser={currentUser}
      mode={page === "kpis" ? "kpis" : "reports"}
    />
  );
}
