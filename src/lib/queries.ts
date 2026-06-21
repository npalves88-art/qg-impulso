import { query } from "./db";

function lastNDates(n: number) {
  const days: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function inPlaceholders(start: number, count: number) {
  return Array.from({ length: count }, (_, i) => `$${start + i}`).join(",");
}

export async function getExecutiveDashboard(companyId: number) {
  const days = lastNDates(30);
  const last7 = days.slice(-7);

  const kpis = await query<any>(
    `SELECT date, revenue, orders, avg_ticket, conversion, ctr, error_rate
     FROM kpi_snapshots WHERE company_id = $1 AND date IN (${inPlaceholders(2, days.length)})
     ORDER BY date ASC`,
    [companyId, ...days]
  );

  const last7Kpis = kpis.filter((k) => last7.includes(k.date));
  const sum = (arr: any[], key: string) => arr.reduce((s, r) => s + (r[key] || 0), 0);
  const avg = (arr: any[], key: string) => (arr.length ? sum(arr, key) / arr.length : 0);

  const revenue7 = sum(last7Kpis, "revenue");
  const orders7 = sum(last7Kpis, "orders");
  const avgTicket7 = orders7 > 0 ? revenue7 / orders7 : 0;
  const conversion7 = avg(last7Kpis, "conversion");
  const ctr7 = avg(last7Kpis, "ctr");
  const errorRate7 = avg(last7Kpis, "error_rate");

  const openComplaintsRows = await query<{ c: number }>(
    `SELECT COUNT(*) as c FROM complaints WHERE company_id = $1 AND status = 'aberta'`,
    [companyId]
  );

  const openErrorsRows = await query<{ c: number }>(
    `SELECT COUNT(*) as c FROM operational_errors WHERE company_id = $1 AND status = 'aberto'`,
    [companyId]
  );

  const criticalProducts = await query<any>(
    `SELECT id, name, stock FROM products WHERE company_id = $1 AND stock < 30 ORDER BY stock ASC LIMIT 5`,
    [companyId]
  );

  const alerts = await query<any>(
    `SELECT * FROM alerts WHERE company_id = $1 AND resolved = 0 ORDER BY created_at DESC`,
    [companyId]
  );

  const delaysCountRows = await query<{ c: number }>(
    `SELECT COUNT(*) as c FROM delays WHERE company_id = $1 AND date IN (${inPlaceholders(2, last7.length)})`,
    [companyId, ...last7]
  );

  const returnsCountRows = await query<{ c: number }>(
    `SELECT COUNT(*) as c FROM returns WHERE company_id = $1 AND date IN (${inPlaceholders(2, last7.length)})`,
    [companyId, ...last7]
  );

  return {
    chart: kpis.map((k) => ({
      date: k.date.slice(5),
      revenue: k.revenue,
      orders: k.orders,
    })),
    revenue7,
    orders7,
    avgTicket7,
    conversion7,
    ctr7,
    errorRate7,
    openComplaints: Number(openComplaintsRows[0].c),
    openErrors: Number(openErrorsRows[0].c),
    criticalProducts,
    alerts,
    delaysCount: Number(delaysCountRows[0].c),
    returnsCount: Number(returnsCountRows[0].c),
  };
}

export async function getTeamRadar(companyId: number) {
  const employees = await query<any>(`SELECT * FROM employees WHERE company_id = $1`, [companyId]);

  const days = lastNDates(30);
  const last7 = days.slice(-7);

  const ranking = await Promise.all(
    employees.map(async (e) => {
      const activities = await query<any>(
        `SELECT * FROM team_activities WHERE employee_id = $1 AND date IN (${inPlaceholders(2, last7.length)})`,
        [e.id, ...last7]
      );

      const totals = activities.reduce(
        (acc, a) => ({
          skus_worked: acc.skus_worked + a.skus_worked,
          ads_created: acc.ads_created + a.ads_created,
          images_made: acc.images_made + a.images_made,
          orders_picked: acc.orders_picked + a.orders_picked,
          orders_shipped: acc.orders_shipped + a.orders_shipped,
          score: acc.score + a.score,
        }),
        { skus_worked: 0, ads_created: 0, images_made: 0, orders_picked: 0, orders_shipped: 0, score: 0 }
      );

      return { ...e, ...totals, score: +totals.score.toFixed(1) };
    })
  );

  ranking.sort((a, b) => b.score - a.score);

  return { employees: ranking };
}

function sumActivities(activities: any[]) {
  return activities.reduce(
    (acc, a) => ({
      skus_worked: acc.skus_worked + a.skus_worked,
      ads_created: acc.ads_created + a.ads_created,
      images_made: acc.images_made + a.images_made,
      orders_picked: acc.orders_picked + a.orders_picked,
      orders_shipped: acc.orders_shipped + a.orders_shipped,
      score: acc.score + a.score,
    }),
    { skus_worked: 0, ads_created: 0, images_made: 0, orders_picked: 0, orders_shipped: 0, score: 0 }
  );
}

export async function getOwnProductivity(employeeId: number) {
  const days30 = lastNDates(30);
  const yesterday = [days30[days30.length - 2]];
  const last7 = days30.slice(-7);

  const all = await query<any>(
    `SELECT * FROM team_activities WHERE employee_id = $1 AND date IN (${inPlaceholders(2, days30.length)}) ORDER BY date ASC`,
    [employeeId, ...days30]
  );

  const byDate: Record<string, any> = {};
  for (const a of all) byDate[a.date] = a;

  const yesterdayActivities = yesterday.filter((d) => byDate[d]).map((d) => byDate[d]);
  const last7Activities = last7.filter((d) => byDate[d]).map((d) => byDate[d]);

  return {
    yesterday: sumActivities(yesterdayActivities),
    last7Days: sumActivities(last7Activities),
    lastMonth: sumActivities(all),
    daily: all,
  };
}

export async function getOperationalRadar(companyId: number) {
  const days30 = lastNDates(30);

  const errors = await query<any>(
    `SELECT oe.*, p.name as product_name, e.name as employee_name
     FROM operational_errors oe
     LEFT JOIN products p ON p.id = oe.product_id
     LEFT JOIN employees e ON e.id = oe.employee_id
     WHERE oe.company_id = $1 ORDER BY oe.date DESC LIMIT 100`,
    [companyId]
  );

  const complaints = await query<any>(
    `SELECT c.*, p.name as product_name, m.name as marketplace_name
     FROM complaints c
     LEFT JOIN products p ON p.id = c.product_id
     LEFT JOIN marketplaces m ON m.id = c.marketplace_id
     WHERE c.company_id = $1 ORDER BY c.date DESC LIMIT 50`,
    [companyId]
  );

  const delays = await query<any>(
    `SELECT d.*, p.name as product_name FROM delays d
     LEFT JOIN products p ON p.id = d.product_id
     WHERE d.company_id = $1 ORDER BY d.date DESC LIMIT 50`,
    [companyId]
  );

  const returns = await query<any>(
    `SELECT r.*, p.name as product_name FROM returns r
     LEFT JOIN products p ON p.id = r.product_id
     WHERE r.company_id = $1 ORDER BY r.date DESC LIMIT 50`,
    [companyId]
  );

  const totalErrors = errors.length;
  const totalCost = errors.reduce((s, e) => s + (e.estimated_cost || 0), 0) + returns.reduce((s, r) => s + (r.cost || 0), 0);
  const totalShipmentsRows = await query<{ c: number }>(
    `SELECT COUNT(*) as c FROM shipments WHERE company_id = $1 AND date IN (${inPlaceholders(2, days30.length)})`,
    [companyId, ...days30]
  );
  const totalShipments = Number(totalShipmentsRows[0].c);

  const errorRate = totalShipments > 0 ? +((totalErrors / totalShipments) * 100).toFixed(2) : 0;

  const errorsByType: Record<string, number> = {};
  for (const e of errors) {
    errorsByType[e.type] = (errorsByType[e.type] || 0) + 1;
  }

  const responsibleCount: Record<string, number> = {};
  for (const e of errors) {
    if (e.employee_name) responsibleCount[e.employee_name] = (responsibleCount[e.employee_name] || 0) + 1;
  }

  return {
    errors,
    complaints,
    delays,
    returns,
    totalErrors,
    totalCost,
    errorRate,
    errorsByType,
    responsibleCount,
    openErrors: errors.filter((e) => e.status === "aberto").length,
    openComplaints: complaints.filter((c) => c.status === "aberta").length,
  };
}

export async function getBusinessRadar(companyId: number) {
  const days7 = lastNDates(7);

  const products = await query<any>(`SELECT * FROM products WHERE company_id = $1`, [companyId]);

  const adsWithMetrics = await query<any>(
    `SELECT a.product_id, SUM(am.revenue) as revenue, SUM(am.orders) as orders
     FROM ad_metrics am
     JOIN ads a ON a.id = am.ad_id
     WHERE am.date IN (${inPlaceholders(1, days7.length)})
     GROUP BY a.product_id`,
    [...days7]
  );

  const revenueByProduct: Record<number, { revenue: number; orders: number }> = {};
  for (const row of adsWithMetrics) {
    revenueByProduct[row.product_id] = { revenue: Number(row.revenue) || 0, orders: Number(row.orders) || 0 };
  }

  const enriched = products.map((p) => {
    const perf = revenueByProduct[p.id] || { revenue: 0, orders: 0 };
    const margin = p.sale_price > 0 ? ((p.sale_price - p.cost_price) / p.sale_price) * 100 : 0;
    return { ...p, revenue7: perf.revenue, orders7: perf.orders, margin: +margin.toFixed(1) };
  });

  const sorted = [...enriched].sort((a, b) => b.revenue7 - a.revenue7);
  const champions = sorted.slice(0, 5);
  const stalled = enriched.filter((p) => p.orders7 === 0 || p.orders7 < 2).slice(0, 6);
  const noSales = enriched.filter((p) => p.orders7 === 0);

  const totalRevenue = enriched.reduce((s, p) => s + p.revenue7, 0);
  let cumulative = 0;
  const abc = sorted.map((p) => {
    cumulative += p.revenue7;
    const pct = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0;
    const curve = pct <= 80 ? "A" : pct <= 95 ? "B" : "C";
    return { ...p, abcCurve: curve, cumulativePct: +pct.toFixed(1) };
  });

  return { products: enriched, champions, stalled, noSales, abc };
}

export async function getMarketplacePerformance(companyId: number) {
  const days30 = lastNDates(30);
  const marketplaces = await query<any>(`SELECT * FROM marketplaces`);

  const perMarketplace = await Promise.all(
    marketplaces.map(async (mp) => {
      const metrics = await query<any>(
        `SELECT am.date, SUM(am.impressions) as impressions, SUM(am.views) as views,
                SUM(am.visits) as visits, SUM(am.clicks) as clicks,
                SUM(am.orders) as orders, SUM(am.revenue) as revenue
         FROM ad_metrics am JOIN ads a ON a.id = am.ad_id
         WHERE a.marketplace_id = $1 AND am.date IN (${inPlaceholders(2, days30.length)})
         GROUP BY am.date ORDER BY am.date ASC`,
        [mp.id, ...days30]
      );

      const totals = metrics.reduce(
        (acc, m) => ({
          impressions: acc.impressions + Number(m.impressions),
          views: acc.views + Number(m.views),
          visits: acc.visits + Number(m.visits),
          clicks: acc.clicks + Number(m.clicks),
          orders: acc.orders + Number(m.orders),
          revenue: acc.revenue + Number(m.revenue),
        }),
        { impressions: 0, views: 0, visits: 0, clicks: 0, orders: 0, revenue: 0 }
      );

      const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
      const conversion = totals.clicks > 0 ? (totals.orders / totals.clicks) * 100 : 0;

      const ads = await query<any>(
        `SELECT a.id, a.title, a.health_score,
                SUM(am.revenue) as revenue, SUM(am.orders) as orders,
                SUM(am.clicks) as clicks, SUM(am.impressions) as impressions
         FROM ads a LEFT JOIN ad_metrics am ON am.ad_id = a.id AND am.date IN (${inPlaceholders(1, days30.length)})
         WHERE a.marketplace_id = $${days30.length + 1}
         GROUP BY a.id ORDER BY revenue DESC`,
        [...days30, mp.id]
      );

      const adsNumeric = ads.map((a) => ({
        ...a,
        revenue: Number(a.revenue) || 0,
        orders: Number(a.orders) || 0,
        clicks: Number(a.clicks) || 0,
        impressions: Number(a.impressions) || 0,
      }));

      return {
        ...mp,
        chart: metrics.map((m) => ({ date: m.date.slice(5), revenue: Number(m.revenue), orders: Number(m.orders) })),
        totals: { ...totals, ctr: +ctr.toFixed(2), conversion: +conversion.toFixed(2) },
        topAds: adsNumeric.slice(0, 5),
        worstAds: [...adsNumeric].sort((a, b) => a.health_score - b.health_score).slice(0, 5),
      };
    })
  );

  return perMarketplace;
}

export async function getCentralIndicadores(companyId: number) {
  const exec = await getExecutiveDashboard(companyId);
  const team = await getTeamRadar(companyId);
  const ops = await getOperationalRadar(companyId);
  const marketplaces = await getMarketplacePerformance(companyId);

  const teamScoreAvg = team.employees.length
    ? team.employees.reduce((s, e) => s + e.score, 0) / team.employees.length
    : 0;

  return {
    traffic: marketplaces.reduce((s, m) => s + m.totals.visits, 0),
    engagement: marketplaces.reduce((s, m) => s + m.totals.clicks, 0),
    conversion: exec.conversion7,
    revenue: exec.revenue7,
    errorRate: ops.errorRate,
    teamScoreAvg: +teamScoreAvg.toFixed(1),
    ctr: exec.ctr7,
    openErrors: ops.openErrors,
    openComplaints: ops.openComplaints,
  };
}

export async function getProducts(companyId: number) {
  return query<any>(`SELECT * FROM products WHERE company_id = $1 ORDER BY name ASC`, [companyId]);
}

export async function getEmployees(companyId: number) {
  return query<any>(
    `SELECT id, company_id, name, role, area, email, admission_date, status, avatar_color,
            (password_hash IS NOT NULL) as has_login
     FROM employees WHERE company_id = $1 ORDER BY name ASC`,
    [companyId]
  );
}

export async function getCompany(companyId: number) {
  const rows = await query<any>(`SELECT * FROM companies WHERE id = $1`, [companyId]);
  return rows[0];
}

export async function getUsers(companyId: number) {
  return query<any>(
    `SELECT e.id, e.name, e.email, e.avatar_color, r.name as role
     FROM employees e JOIN roles r ON r.id = e.role_id
     WHERE e.company_id = $1 AND e.password_hash IS NOT NULL
     ORDER BY e.name ASC`,
    [companyId]
  );
}
