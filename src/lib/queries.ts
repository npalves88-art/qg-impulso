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

  const dailyMetrics = await query<any>(
    `SELECT am.date,
            SUM(am.revenue) as revenue,
            SUM(am.orders) as orders,
            SUM(am.impressions) as impressions,
            SUM(am.clicks) as clicks,
            SUM(am.visits) as visits
     FROM ad_metrics am
     JOIN ads a ON a.id = am.ad_id
     JOIN products p ON p.id = a.product_id
     WHERE p.company_id = $1 AND am.date IN (${inPlaceholders(2, days.length)})
     GROUP BY am.date ORDER BY am.date ASC`,
    [companyId, ...days]
  );

  const kpis = dailyMetrics.map((d) => ({
    date: d.date,
    revenue: Number(d.revenue) || 0,
    orders: Number(d.orders) || 0,
    impressions: Number(d.impressions) || 0,
    clicks: Number(d.clicks) || 0,
    visits: Number(d.visits) || 0,
  }));

  const last7Kpis = kpis.filter((k) => last7.includes(k.date));
  const sum = (arr: any[], key: string) => arr.reduce((s, r) => s + (r[key] || 0), 0);

  const revenue7 = sum(last7Kpis, "revenue");
  const orders7 = sum(last7Kpis, "orders");
  const impressions7 = sum(last7Kpis, "impressions");
  const clicks7 = sum(last7Kpis, "clicks");
  const avgTicket7 = orders7 > 0 ? revenue7 / orders7 : 0;
  const conversion7 = clicks7 > 0 ? (orders7 / clicks7) * 100 : 0;
  const ctr7 = impressions7 > 0 ? (clicks7 / impressions7) * 100 : 0;

  const today = days[days.length - 1];
  const todayKpis = kpis.filter((k) => k.date === today);
  const revenueToday = sum(todayKpis, "revenue");
  const ordersToday = sum(todayKpis, "orders");
  const visitsToday = sum(todayKpis, "visits");
  const avgTicketToday = ordersToday > 0 ? revenueToday / ordersToday : 0;
  const conversionToday = visitsToday > 0 ? (ordersToday / visitsToday) * 100 : 0;

  const shipments7Rows = await query<{ c: number }>(
    `SELECT COUNT(*) as c FROM shipments WHERE company_id = $1 AND date IN (${inPlaceholders(2, last7.length)})`,
    [companyId, ...last7]
  );
  const errors7Rows = await query<{ c: number }>(
    `SELECT COUNT(*) as c FROM operational_errors WHERE company_id = $1 AND date IN (${inPlaceholders(2, last7.length)})`,
    [companyId, ...last7]
  );
  const shipments7 = Number(shipments7Rows[0].c);
  const errorRate7 = shipments7 > 0 ? (Number(errors7Rows[0].c) / shipments7) * 100 : 0;

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
    revenueToday,
    ordersToday,
    avgTicketToday,
    conversionToday,
    visitsToday,
    openComplaints: Number(openComplaintsRows[0].c),
    openErrors: Number(openErrorsRows[0].c),
    criticalProducts,
    alerts,
    delaysCount: Number(delaysCountRows[0].c),
    returnsCount: Number(returnsCountRows[0].c),
  };
}

async function getDailyReportsWithSkus(employeeId: number, dates: string[]) {
  if (dates.length === 0) return [];
  const reports = await query<any>(
    `SELECT * FROM daily_reports WHERE employee_id = $1 AND date IN (${inPlaceholders(2, dates.length)})`,
    [employeeId, ...dates]
  );
  if (reports.length === 0) return [];

  const reportIds = reports.map((r) => r.id);
  const skus = await query<any>(
    `SELECT * FROM daily_report_skus WHERE daily_report_id = ANY($1::int[])`,
    [reportIds]
  );

  return reports.map((r) => ({
    ...r,
    skus: skus.filter((s) => s.daily_report_id === r.id),
  }));
}

function summarizeReports(reports: any[]) {
  let skusWorked = 0;
  let adsCreated = 0;
  let imagesMade = 0;
  let scoreSum = 0;
  let scoreCount = 0;

  for (const r of reports) {
    skusWorked += r.skus.length;
    for (const s of r.skus) {
      const acts: string[] = s.activities || [];
      if (acts.includes("criacao_anuncio")) adsCreated++;
      if (acts.includes("criacao_imagens") || acts.includes("edicao_imagens")) imagesMade++;
    }
    if (r.self_score !== null && r.self_score !== undefined) {
      scoreSum += Number(r.self_score);
      scoreCount++;
    }
  }

  return {
    skus_worked: skusWorked,
    ads_created: adsCreated,
    images_made: imagesMade,
    score: scoreCount > 0 ? +(scoreSum / scoreCount).toFixed(1) : 0,
  };
}

export async function getTeamRadar(companyId: number) {
  const employees = await query<any>(`SELECT * FROM employees WHERE company_id = $1`, [companyId]);

  const days = lastNDates(30);
  const last7 = days.slice(-7);

  const ranking = await Promise.all(
    employees.map(async (e) => {
      const reports = await getDailyReportsWithSkus(e.id, last7);
      const totals = summarizeReports(reports);
      return { ...e, ...totals };
    })
  );

  ranking.sort((a, b) => b.score - a.score);

  return { employees: ranking };
}

export async function getOwnDashboard(employeeId: number) {
  const allReportsRes = await query<any>(
    `SELECT * FROM daily_reports WHERE employee_id = $1 ORDER BY date DESC`,
    [employeeId]
  );
  const reportIds = allReportsRes.map((r) => r.id);
  const allSkus = reportIds.length
    ? await query<any>(`SELECT * FROM daily_report_skus WHERE daily_report_id = ANY($1::int[])`, [reportIds])
    : [];

  const skusByReport: Record<number, any[]> = {};
  for (const s of allSkus) {
    (skusByReport[s.daily_report_id] ||= []).push(s);
  }

  const days7 = lastNDates(7);
  const days30 = lastNDates(30);

  let totalSkus = 0;
  let weekSkus = 0;
  let monthSkus = 0;
  let adsCreatedTotal = 0;
  let seoTotal = 0;
  let scoreSum = 0;
  let scoreCount = 0;
  const skusPerDay: Record<string, number> = {};
  const gargaloRanking: Record<string, number> = {};

  for (const r of allReportsRes) {
    const skus = skusByReport[r.id] || [];
    totalSkus += skus.length;
    if (days7.includes(r.date)) weekSkus += skus.length;
    if (days30.includes(r.date)) monthSkus += skus.length;
    skusPerDay[r.date] = (skusPerDay[r.date] || 0) + skus.length;

    for (const s of skus) {
      const acts: string[] = s.activities || [];
      if (acts.includes("criacao_anuncio")) adsCreatedTotal++;
      if (acts.includes("seo")) seoTotal++;
    }

    if (r.self_score !== null && r.self_score !== undefined) {
      scoreSum += Number(r.self_score);
      scoreCount++;
    }

    for (const g of r.gargalos || []) {
      gargaloRanking[g] = (gargaloRanking[g] || 0) + 1;
    }
  }

  const skusPorDiaUltimos7 = days7.map((d) => ({ date: d, count: skusPerDay[d] || 0 }));
  const rankingGargalos = Object.entries(gargaloRanking)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const recentEntries = allReportsRes.slice(0, 10).map((r) => {
    const skus = skusByReport[r.id] || [];
    let ads = 0;
    let seo = 0;
    let images = 0;
    for (const s of skus) {
      const acts: string[] = s.activities || [];
      if (acts.includes("criacao_anuncio")) ads++;
      if (acts.includes("seo")) seo++;
      if (acts.includes("criacao_imagens") || acts.includes("edicao_imagens")) images++;
    }
    return {
      date: r.date,
      cliente: r.cliente,
      skus: skus.length,
      ads,
      seo,
      images,
      score: r.self_score,
    };
  });

  return {
    totalSkus,
    weekSkus,
    monthSkus,
    adsCreatedTotal,
    seoTotal,
    avgScore: scoreCount > 0 ? +(scoreSum / scoreCount).toFixed(1) : 0,
    skusPorDiaUltimos7,
    rankingGargalos,
    recentEntries,
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

export async function getClients(companyId: number) {
  const clients = await query<any>(
    `SELECT * FROM clients WHERE company_id = $1 ORDER BY razao_social ASC`,
    [companyId]
  );
  if (clients.length === 0) return [];

  const assignments = await query<{ client_id: number; employee_id: number; employee_name: string }>(
    `SELECT ec.client_id, ec.employee_id, e.name as employee_name
     FROM employee_clients ec JOIN employees e ON e.id = ec.employee_id
     WHERE ec.client_id = ANY($1::int[])`,
    [clients.map((c) => c.id)]
  );

  return clients.map((c) => ({
    ...c,
    employees: assignments.filter((a) => a.client_id === c.id).map((a) => ({ id: a.employee_id, name: a.employee_name })),
  }));
}

export async function getClientsForEmployee(employeeId: number) {
  return query<any>(
    `SELECT c.* FROM clients c
     JOIN employee_clients ec ON ec.client_id = c.id
     WHERE ec.employee_id = $1 AND c.status = 'ativo'
     ORDER BY c.razao_social ASC`,
    [employeeId]
  );
}
