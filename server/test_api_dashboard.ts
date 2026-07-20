import { getAdminDashboard } from './src/services/dashboard.service.js';

async function main() {
  const data = await getAdminDashboard();
  console.log("Dashboard KPIs:", JSON.stringify(data.kpis, null, 2));
}

main().catch(console.error);
