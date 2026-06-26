import { Pool } from "pg";
import bcrypt from "bcryptjs";

declare global {
  // eslint-disable-next-line no-var
  var __qgPgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __qgSchemaReady: Promise<void> | undefined;
}

function getConnectionString(): string {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL (ou POSTGRES_URL) não definida. Configure a variável de ambiente apontando para o Postgres (Vercel Postgres / Neon)."
    );
  }
  return url;
}

export async function getPool(): Promise<Pool> {
  if (!global.__qgPgPool) {
    global.__qgPgPool = new Pool({
      connectionString: getConnectionString(),
      max: 5,
      idleTimeoutMillis: 10_000,
      // Neon's free-tier compute auto-suspends when idle; waking it up (cold start) can take
      // longer than a typical connection timeout, so this needs to be generous.
      connectionTimeoutMillis: 30_000,
    });
    global.__qgPgPool.on("error", (err) => {
      console.error("Erro inesperado no pool do Postgres:", err);
    });
  }
  return global.__qgPgPool;
}

const TRANSIENT_ERROR_CODES = new Set(["ECONNRESET", "ETIMEDOUT", "EPIPE", "08006", "08003", "08P01"]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createSchema(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      cnpj TEXT,
      segment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id SERIAL PRIMARY KEY,
      role_id INTEGER NOT NULL,
      resource TEXT NOT NULL,
      can_view INTEGER DEFAULT 1,
      can_edit INTEGER DEFAULT 0,
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#FF6B00',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      area TEXT NOT NULL,
      email TEXT,
      admission_date TEXT,
      status TEXT DEFAULT 'ativo',
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );

    CREATE TABLE IF NOT EXISTS marketplaces (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      color TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT,
      cost_price DOUBLE PRECISION,
      sale_price DOUBLE PRECISION,
      stock INTEGER DEFAULT 0,
      curve TEXT DEFAULT 'B',
      status TEXT DEFAULT 'ativo',
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );

    CREATE TABLE IF NOT EXISTS skus (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL,
      code TEXT UNIQUE NOT NULL,
      variation TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS ads (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL,
      marketplace_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'ativo',
      health_score INTEGER DEFAULT 80,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (marketplace_id) REFERENCES marketplaces(id)
    );

    CREATE TABLE IF NOT EXISTS ad_metrics (
      id SERIAL PRIMARY KEY,
      ad_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      impressions INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      visits INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      orders INTEGER DEFAULT 0,
      revenue DOUBLE PRECISION DEFAULT 0,
      FOREIGN KEY (ad_id) REFERENCES ads(id)
    );

    CREATE TABLE IF NOT EXISTS sales_metrics (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL,
      marketplace_id INTEGER,
      date TEXT NOT NULL,
      orders INTEGER DEFAULT 0,
      revenue DOUBLE PRECISION DEFAULT 0,
      avg_ticket DOUBLE PRECISION DEFAULT 0,
      conversion DOUBLE PRECISION DEFAULT 0,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );

    CREATE TABLE IF NOT EXISTS team_activities (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      skus_worked INTEGER DEFAULT 0,
      ads_created INTEGER DEFAULT 0,
      images_made INTEGER DEFAULT 0,
      orders_picked INTEGER DEFAULT 0,
      orders_shipped INTEGER DEFAULT 0,
      score DOUBLE PRECISION DEFAULT 0,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS daily_reports (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      cliente TEXT,
      gargalos TEXT[] DEFAULT '{}',
      gargalos_detalhamento TEXT,
      self_score INTEGER,
      ai_analysis TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employee_id, date)
    );

    CREATE TABLE IF NOT EXISTS daily_report_skus (
      id SERIAL PRIMARY KEY,
      daily_report_id INTEGER NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
      sku_code TEXT,
      product_name TEXT,
      activities TEXT[] DEFAULT '{}',
      observacao TEXT
    );

    CREATE TABLE IF NOT EXISTS daily_report_pendencias (
      id SERIAL PRIMARY KEY,
      daily_report_id INTEGER NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
      sku_code TEXT,
      motivo TEXT
    );

    CREATE TABLE IF NOT EXISTS daily_report_planejamento (
      id SERIAL PRIMARY KEY,
      daily_report_id INTEGER NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
      sku_code TEXT,
      produto TEXT,
      atividade TEXT
    );

    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      razao_social TEXT NOT NULL,
      responsavel TEXT,
      platforms TEXT[] DEFAULT '{}',
      status TEXT DEFAULT 'ativo',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS processed_orders (
      id SERIAL PRIMARY KEY,
      marketplace TEXT NOT NULL,
      external_order_id TEXT NOT NULL,
      company_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(marketplace, external_order_id)
    );

    CREATE TABLE IF NOT EXISTS employee_clients (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      UNIQUE(employee_id, client_id)
    );

    CREATE TABLE IF NOT EXISTS operational_errors (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL,
      product_id INTEGER,
      employee_id INTEGER,
      type TEXT NOT NULL,
      description TEXT,
      estimated_cost DOUBLE PRECISION DEFAULT 0,
      sla_hours INTEGER,
      status TEXT DEFAULT 'aberto',
      date TEXT NOT NULL,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL,
      product_id INTEGER,
      marketplace_id INTEGER,
      reason TEXT,
      severity TEXT DEFAULT 'media',
      status TEXT DEFAULT 'aberta',
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS delays (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL,
      product_id INTEGER,
      marketplace_id INTEGER,
      days_late INTEGER,
      reason TEXT,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS returns (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL,
      product_id INTEGER,
      marketplace_id INTEGER,
      reason TEXT,
      cost DOUBLE PRECISION DEFAULT 0,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shipments (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL,
      product_id INTEGER,
      marketplace_id INTEGER,
      status TEXT DEFAULT 'enviado',
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kpi_snapshots (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      revenue DOUBLE PRECISION,
      orders INTEGER,
      avg_ticket DOUBLE PRECISION,
      conversion DOUBLE PRECISION,
      ctr DOUBLE PRECISION,
      error_rate DOUBLE PRECISION
    );

    CREATE TABLE IF NOT EXISTS ai_reports (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL,
      question TEXT,
      answer TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL,
      type TEXT,
      severity TEXT DEFAULT 'media',
      message TEXT,
      resolved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS marketplace_integrations (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL,
      marketplace TEXT NOT NULL,
      client_id TEXT,
      client_secret TEXT,
      shop_id TEXT,
      seller_id TEXT,
      access_token TEXT,
      refresh_token TEXT,
      expires_at TEXT,
      status TEXT DEFAULT 'desconectado',
      last_sync_at TEXT,
      last_sync_summary TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(company_id, marketplace)
    );
  `);
}

async function seed(pool: Pool) {
  const companyCountRes = await pool.query("SELECT COUNT(*) as c FROM companies");
  const companyCount = Number(companyCountRes.rows[0].c);
  if (companyCount > 0) return;

  const companyRes = await pool.query(
    "INSERT INTO companies (name, cnpj, segment) VALUES ($1, $2, $3) RETURNING id",
    ["Impulso Comércio Eletrônico Ltda", "12.345.678/0001-90", "E-commerce / Marketplace"]
  );
  const companyId = companyRes.rows[0].id as number;

  const roleNames = ["Administrador", "Gestor", "Operador", "Analista"];
  const roleIds: Record<string, number> = {};
  for (const r of roleNames) {
    const res = await pool.query("INSERT INTO roles (name) VALUES ($1) RETURNING id", [r]);
    roleIds[r] = res.rows[0].id as number;
  }

  const resources = ["dashboard", "anuncios", "equipe", "operacional", "negocio", "marketplace", "indicadores", "ia", "configuracoes"];
  for (const role of roleNames) {
    for (const res of resources) {
      const canEdit = role === "Administrador" || role === "Gestor" ? 1 : res === "operacional" ? 1 : 0;
      await pool.query(
        "INSERT INTO permissions (role_id, resource, can_view, can_edit) VALUES ($1, $2, $3, $4)",
        [roleIds[role], res, 1, canEdit]
      );
    }
  }

  const demoUsers = [
    { name: "Camila Souza", email: "admin@qgimpulso.com", role: "Administrador", color: "#FF6B00" },
    { name: "Rafael Lima", email: "gestor@qgimpulso.com", role: "Gestor", color: "#123C4A" },
    { name: "Bruna Alves", email: "operador@qgimpulso.com", role: "Operador", color: "#2E7D32" },
    { name: "Diego Martins", email: "analista@qgimpulso.com", role: "Analista", color: "#7B1FA2" },
  ];
  const passwordHash = bcrypt.hashSync("impulso123", 10);
  for (const u of demoUsers) {
    await pool.query(
      "INSERT INTO users (company_id, role_id, name, email, password_hash, avatar_color) VALUES ($1, $2, $3, $4, $5, $6)",
      [companyId, roleIds[u.role], u.name, u.email, passwordHash, u.color]
    );
  }

  const mlRes = await pool.query("INSERT INTO marketplaces (name, color) VALUES ($1, $2) RETURNING id", ["Mercado Livre", "#FFE600"]);
  const mlId = mlRes.rows[0].id as number;
  const shopeeRes = await pool.query("INSERT INTO marketplaces (name, color) VALUES ($1, $2) RETURNING id", ["Shopee", "#EE4D2D"]);
  const shopeeId = shopeeRes.rows[0].id as number;
  const marketplaceIds = [mlId, shopeeId];

  const employeeDefs = [
    { name: "Larissa Costa", role: "Criação de Anúncios", area: "Marketing" },
    { name: "Pedro Henrique", role: "Designer", area: "Marketing" },
    { name: "Juliana Ferreira", role: "Separação", area: "Operação" },
    { name: "Marcos Vinícius", role: "Expedição", area: "Operação" },
    { name: "Aline Rodrigues", role: "Atendimento", area: "Atendimento" },
    { name: "Thiago Nunes", role: "Cadastro de Produtos", area: "Marketing" },
  ];
  const employeeIds: number[] = [];
  for (const e of employeeDefs) {
    const res = await pool.query(
      "INSERT INTO employees (company_id, name, role, area, email, admission_date, status) VALUES ($1, $2, $3, $4, $5, $6, 'ativo') RETURNING id",
      [
        companyId,
        e.name,
        e.role,
        e.area,
        e.name.toLowerCase().replace(/\s+/g, ".") + "@qgimpulso.com",
        "2024-0" + (1 + Math.floor(Math.random() * 9)) + "-15",
      ]
    );
    employeeIds.push(res.rows[0].id as number);
  }

  const categories = ["Casa e Decoração", "Eletrônicos", "Moda", "Beleza", "Ferramentas", "Pet Shop", "Esporte e Lazer"];
  const productNames = [
    "Luminária de Mesa LED", "Fone Bluetooth TWS", "Organizador Multiuso", "Kit Pincéis de Maquiagem",
    "Furadeira Parafusadeira 12V", "Comedouro Automático Pet", "Garrafa Térmica 1L", "Suporte para Celular Veicular",
    "Mini Ventilador Portátil", "Capa para Notebook 15.6", "Tapete Antiderrapante Banheiro", "Kit Ferramentas 50 Peças",
    "Carregador Portátil 10000mAh", "Cinto de Academia Lombar", "Aspirador Pó Portátil", "Câmera de Segurança Wi-Fi",
    "Relógio Inteligente Smartwatch", "Mochila Notebook Impermeável", "Air Fryer 4L", "Caixa de Som Bluetooth",
  ];
  const productIds: number[] = [];
  const curves = ["A", "A", "B", "B", "B", "C", "C"];
  for (let i = 0; i < productNames.length; i++) {
    const cost = +(20 + Math.random() * 180).toFixed(2);
    const sale = +(cost * (1.4 + Math.random() * 0.9)).toFixed(2);
    const curve = curves[i % curves.length];
    const res = await pool.query(
      "INSERT INTO products (company_id, name, category, cost_price, sale_price, stock, curve, status) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ativo') RETURNING id",
      [companyId, productNames[i], categories[i % categories.length], cost, sale, Math.floor(Math.random() * 400), curve]
    );
    productIds.push(res.rows[0].id as number);
  }

  for (let i = 0; i < productIds.length; i++) {
    await pool.query("INSERT INTO skus (product_id, code, variation) VALUES ($1, $2, $3)", [
      productIds[i],
      `SKU-${1000 + i}`,
      "Padrão",
    ]);
  }

  const adIds: { id: number; productId: number; marketplaceId: number }[] = [];
  for (let i = 0; i < productIds.length; i++) {
    const pid = productIds[i];
    const product = productNames[i];
    for (const mpId of marketplaceIds) {
      const health = 40 + Math.floor(Math.random() * 60);
      const res = await pool.query(
        "INSERT INTO ads (product_id, marketplace_id, title, status, health_score) VALUES ($1, $2, $3, 'ativo', $4) RETURNING id",
        [pid, mpId, product, health]
      );
      adIds.push({ id: res.rows[0].id as number, productId: pid, marketplaceId: mpId as number });
    }
  }

  const today = new Date();
  const dateStr = (d: Date) => d.toISOString().slice(0, 10);
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(dateStr(d));
  }

  for (const day of days) {
    let dayRevenueTotal = 0;
    let dayOrdersTotal = 0;
    let dayImpressionsTotal = 0;
    let dayClicksTotal = 0;

    for (const mpId of marketplaceIds) {
      const adsForMp = adIds.filter((a) => a.marketplaceId === mpId);
      let mpRevenue = 0;
      let mpOrders = 0;
      for (const ad of adsForMp) {
        const product = productIds.indexOf(ad.productId);
        const salePrice = +(50 + (product % 7) * 30 + Math.random() * 40).toFixed(2);
        const impressions = Math.floor(800 + Math.random() * 4000);
        const views = Math.floor(impressions * (0.5 + Math.random() * 0.3));
        const visits = Math.floor(views * (0.6 + Math.random() * 0.3));
        const clicks = Math.floor(visits * (0.4 + Math.random() * 0.4));
        const orders = Math.floor(clicks * (0.02 + Math.random() * 0.07));
        const revenue = +(orders * salePrice).toFixed(2);
        await pool.query(
          "INSERT INTO ad_metrics (ad_id, date, impressions, views, visits, clicks, orders, revenue) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
          [ad.id, day, impressions, views, visits, clicks, orders, revenue]
        );
        mpRevenue += revenue;
        mpOrders += orders;
        dayImpressionsTotal += impressions;
        dayClicksTotal += clicks;
      }
      const avgTicket = mpOrders > 0 ? +(mpRevenue / mpOrders).toFixed(2) : 0;
      const conversion = +(Math.random() * 3 + 1).toFixed(2);
      await pool.query(
        "INSERT INTO sales_metrics (company_id, marketplace_id, date, orders, revenue, avg_ticket, conversion) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [companyId, mpId, day, mpOrders, mpRevenue, avgTicket, conversion]
      );
      dayRevenueTotal += mpRevenue;
      dayOrdersTotal += mpOrders;
    }

    const ctr = dayImpressionsTotal > 0 ? +((dayClicksTotal / dayImpressionsTotal) * 100).toFixed(2) : 0;
    const avgTicketDay = dayOrdersTotal > 0 ? +(dayRevenueTotal / dayOrdersTotal).toFixed(2) : 0;
    const conversionDay = +(Math.random() * 2 + 1.5).toFixed(2);
    const errorRate = +(Math.random() * 4 + 0.5).toFixed(2);
    await pool.query(
      "INSERT INTO kpi_snapshots (company_id, date, revenue, orders, avg_ticket, conversion, ctr, error_rate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [companyId, day, +dayRevenueTotal.toFixed(2), dayOrdersTotal, avgTicketDay, conversionDay, ctr, errorRate]
    );
  }

  for (const empId of employeeIds) {
    for (const day of days) {
      const skusWorked = Math.floor(Math.random() * 12);
      const adsCreated = Math.floor(Math.random() * 6);
      const imagesMade = Math.floor(Math.random() * 10);
      const ordersPicked = Math.floor(Math.random() * 60);
      const ordersShipped = Math.floor(ordersPicked * (0.8 + Math.random() * 0.2));
      const score = +(
        skusWorked * 1.5 + adsCreated * 3 + imagesMade * 1.2 + ordersPicked * 0.5 + ordersShipped * 0.6
      ).toFixed(1);
      await pool.query(
        "INSERT INTO team_activities (employee_id, date, skus_worked, ads_created, images_made, orders_picked, orders_shipped, score) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [empId, day, skusWorked, adsCreated, imagesMade, ordersPicked, ordersShipped, score]
      );
    }
  }

  const errorTypes = ["Produto Errado", "Faltando", "Quantidade Errada", "Embalagem Danificada", "Etiqueta Trocada"];
  for (let i = 0; i < 40; i++) {
    const day = days[Math.floor(Math.random() * days.length)];
    const product = productIds[Math.floor(Math.random() * productIds.length)];
    const emp = employeeIds[Math.floor(Math.random() * employeeIds.length)];
    const type = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    await pool.query(
      "INSERT INTO operational_errors (company_id, product_id, employee_id, type, description, estimated_cost, sla_hours, status, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [
        companyId,
        product,
        emp,
        type,
        `Ocorrência de "${type.toLowerCase()}" identificada na expedição.`,
        +(15 + Math.random() * 150).toFixed(2),
        [24, 48, 72][Math.floor(Math.random() * 3)],
        Math.random() > 0.3 ? "resolvido" : "aberto",
        day,
      ]
    );
  }

  const complaintReasons = ["Produto não corresponde ao anúncio", "Atraso na entrega", "Produto com defeito", "Atendimento ruim", "Embalagem violada"];
  for (let i = 0; i < 25; i++) {
    const day = days[Math.floor(Math.random() * days.length)];
    await pool.query(
      "INSERT INTO complaints (company_id, product_id, marketplace_id, reason, severity, status, date) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [
        companyId,
        productIds[Math.floor(Math.random() * productIds.length)],
        marketplaceIds[Math.floor(Math.random() * marketplaceIds.length)],
        complaintReasons[Math.floor(Math.random() * complaintReasons.length)],
        ["baixa", "media", "alta"][Math.floor(Math.random() * 3)],
        Math.random() > 0.4 ? "resolvida" : "aberta",
        day,
      ]
    );
  }

  for (let i = 0; i < 18; i++) {
    const day = days[Math.floor(Math.random() * days.length)];
    await pool.query(
      "INSERT INTO delays (company_id, product_id, marketplace_id, days_late, reason, date) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        companyId,
        productIds[Math.floor(Math.random() * productIds.length)],
        marketplaceIds[Math.floor(Math.random() * marketplaceIds.length)],
        1 + Math.floor(Math.random() * 5),
        ["Transportadora", "Falta de estoque", "Erro de separação", "Volume alto de pedidos"][Math.floor(Math.random() * 4)],
        day,
      ]
    );
  }

  const returnReasons = ["Desistência do comprador", "Produto com defeito", "Produto diferente do anunciado", "Arrependimento"];
  for (let i = 0; i < 20; i++) {
    const day = days[Math.floor(Math.random() * days.length)];
    await pool.query(
      "INSERT INTO returns (company_id, product_id, marketplace_id, reason, cost, date) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        companyId,
        productIds[Math.floor(Math.random() * productIds.length)],
        marketplaceIds[Math.floor(Math.random() * marketplaceIds.length)],
        returnReasons[Math.floor(Math.random() * returnReasons.length)],
        +(20 + Math.random() * 100).toFixed(2),
        day,
      ]
    );
  }

  for (let i = 0; i < 60; i++) {
    const day = days[Math.floor(Math.random() * days.length)];
    await pool.query(
      "INSERT INTO shipments (company_id, product_id, marketplace_id, status, date) VALUES ($1, $2, $3, $4, $5)",
      [
        companyId,
        productIds[Math.floor(Math.random() * productIds.length)],
        marketplaceIds[Math.floor(Math.random() * marketplaceIds.length)],
        ["enviado", "entregue", "em trânsito"][Math.floor(Math.random() * 3)],
        day,
      ]
    );
  }

  const alertSeeds = [
    { type: "anuncio", severity: "alta", message: "Anúncio 'Câmera de Segurança Wi-Fi' com CTR 60% abaixo da média." },
    { type: "operacional", severity: "alta", message: "Taxa de erro operacional acima da meta nos últimos 7 dias." },
    { type: "estoque", severity: "media", message: "Produto 'Air Fryer 4L' com estoque crítico (abaixo de 15 unidades)." },
    { type: "reclamacao", severity: "media", message: "Aumento de 18% em reclamações sobre atraso na entrega." },
    { type: "produtividade", severity: "baixa", message: "Queda de produtividade da equipe de expedição na última semana." },
  ];
  for (const a of alertSeeds) {
    await pool.query(
      "INSERT INTO alerts (company_id, type, severity, message, resolved) VALUES ($1, $2, $3, $4, $5)",
      [companyId, a.type, a.severity, a.message, 0]
    );
  }
}

async function migrateEmployeesUsersUnification(pool: Pool) {
  await pool.query(`
    ALTER TABLE employees ALTER COLUMN role DROP NOT NULL;
    ALTER TABLE employees ALTER COLUMN area DROP NOT NULL;
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id);
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT '#FF6B00';
    CREATE UNIQUE INDEX IF NOT EXISTS employees_email_unique_idx ON employees (email) WHERE email IS NOT NULL;
  `);

  const usersRes = await pool.query(`SELECT * FROM users`);
  for (const u of usersRes.rows) {
    const existing = await pool.query(`SELECT id FROM employees WHERE email = $1`, [u.email]);
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE employees SET password_hash = $1, role_id = $2, avatar_color = $3 WHERE id = $4`,
        [u.password_hash, u.role_id, u.avatar_color, existing.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO employees (company_id, name, email, password_hash, role_id, avatar_color, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'ativo')`,
        [u.company_id, u.name, u.email, u.password_hash, u.role_id, u.avatar_color]
      );
    }
  }
}

async function migrateDailyReportsExtraColumns(pool: Pool) {
  await pool.query(`
    ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS cliente TEXT;
    ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS ai_analysis TEXT;
    ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id);
  `);
}

async function migrateCompanyLogo(pool: Pool) {
  await pool.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;`);
}

async function migrateAdsExternalId(pool: Pool) {
  await pool.query(`
    ALTER TABLE ads ADD COLUMN IF NOT EXISTS external_id TEXT;
    CREATE INDEX IF NOT EXISTS ads_external_id_idx ON ads (external_id);
  `);
}

async function migrateComplaintsExternalId(pool: Pool) {
  await pool.query(`
    ALTER TABLE complaints ADD COLUMN IF NOT EXISTS external_id TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS complaints_external_id_idx ON complaints (external_id) WHERE external_id IS NOT NULL;
  `);
}

export async function ensureSchemaAndSeed(): Promise<void> {
  const pool = await getPool();
  await createSchema(pool);
  await seed(pool);
  await migrateEmployeesUsersUnification(pool);
  await migrateDailyReportsExtraColumns(pool);
  await migrateCompanyLogo(pool);
  await migrateAdsExternalId(pool);
  await migrateComplaintsExternalId(pool);
}

function ensureInit(): Promise<void> {
  if (!global.__qgSchemaReady) {
    global.__qgSchemaReady = ensureSchemaAndSeed();
  }
  return global.__qgSchemaReady;
}

export async function query<T = any>(sql: string, params?: any[], attempt = 1): Promise<T[]> {
  await ensureInit();
  const pool = await getPool();
  try {
    const result = await pool.query(sql, params);
    return result.rows as T[];
  } catch (err: any) {
    const code = err?.code as string | undefined;
    const message = String(err?.message || "");
    const isTransient =
      (code && TRANSIENT_ERROR_CODES.has(code)) ||
      message.includes("timeout") ||
      message.includes("Connection terminated");
    if (isTransient && attempt < 3) {
      await sleep(400 * attempt);
      return query<T>(sql, params, attempt + 1);
    }
    throw err;
  }
}
