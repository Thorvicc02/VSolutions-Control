/* VSolutions Control — datos solo en este dispositivo. */
"use strict";

const KEY = "vsol-impresiones-v1";
const INVENTORY_VERSION = 2;
const ANCHO_TELA_M = 1.6;
const ANCHO_OTROS_M = 1.52;

const MATERIAL_SEED = [
  { nombre: "Adhesivo", precioM2: 6000 },
  { nombre: "Adhesivo transparente", precioM2: 6000 },
  { nombre: "Adhesivo transparente matte", precioM2: 6000 },
  { nombre: "Adhesivo espejo", precioM2: 6000 },
  { nombre: "Adhesivo laminado", precioM2: 9500 },
  { nombre: "Tela PVC", precioM2: 6000 },
  { nombre: "Tela backlit", precioM2: 8500 },
  { nombre: "Tela blackout", precioM2: 8500 },
  { nombre: "Papel film", precioM2: 6000 },
  { nombre: "Papel film backlit", precioM2: 8500 },
  { nombre: "Windows Vision", precioM2: 8500 },
  { nombre: "Reflectante", precioM2: 3500 },
  { nombre: "Adhesivo sin impresión", precioM2: 3500 },
];

const NAV = [
  { id: "inicio", label: "Inicio", short: "Inicio" },
  { id: "nueva", label: "Nueva impresión", short: "Nueva" },
  { id: "trabajos", label: "Trabajos", short: "Trabajos" },
  { id: "cobros", label: "Cobros", short: "Cobros" },
  { id: "inventario", label: "Inventario", short: "Inventario" },
  { id: "ganancia", label: "Ganancia", short: "Ganancia" },
];

const PAGO_KEY = "vsol-datos-pago-v1";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function mid(nombre) {
  return "mat-" + String(nombre).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function nid(prefix) {
  return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function matId(nombre) {
  return mid(nombre);
}

function seedMaterials() {
  return MATERIAL_SEED.map((m) => ({
    id: mid(m.nombre),
    nombre: m.nombre,
    precioM2: m.precioM2,
    costoM2: null,
  }));
}

function isTelaMaterial(materialId) {
  return (
    materialId === matId("Tela PVC") ||
    materialId === matId("Tela backlit") ||
    materialId === matId("Tela blackout")
  );
}

function defaultAnchoM(materialId) {
  return isTelaMaterial(materialId) ? ANCHO_TELA_M : ANCHO_OTROS_M;
}

function deductTargetMaterialIds(materialId) {
  if (materialId === matId("Adhesivo laminado")) {
    return [matId("Adhesivo"), matId("Adhesivo transparente matte")];
  }
  if (materialId === matId("Adhesivo")) return [matId("Adhesivo")];
  if (
    materialId === matId("Adhesivo transparente") ||
    materialId === matId("Adhesivo transparente matte") ||
    materialId === matId("Adhesivo espejo")
  ) {
    return [matId("Adhesivo transparente matte")];
  }
  if (materialId === matId("Tela backlit") || materialId === matId("Tela blackout")) {
    return [matId("Tela backlit")];
  }
  if (materialId === matId("Tela PVC")) return [matId("Tela PVC")];
  if (materialId === matId("Windows Vision")) return [matId("Windows Vision")];
  if (materialId === matId("Papel film backlit")) return [matId("Papel film backlit")];
  return [];
}

function defaultsMaterialCliente(materialId) {
  return materialId === matId("Reflectante");
}

function seedRolls() {
  return [
    { id: "r2-adh-glossy", materialId: matId("Adhesivo"), nombre: "Adhesivo glossy (normal)", mLineales: 40, anchoM: ANCHO_OTROS_M, nota: "" },
    { id: "r2-backlit", materialId: matId("Tela backlit"), nombre: "Tela backlit / blackout", mLineales: 40, anchoM: ANCHO_TELA_M, nota: "" },
    { id: "r2-matte", materialId: matId("Adhesivo transparente matte"), nombre: "Adhesivo transparente matte", mLineales: 8, anchoM: ANCHO_OTROS_M, nota: "" },
    { id: "r2-pvc", materialId: matId("Tela PVC"), nombre: "Tela PVC", mLineales: 20, anchoM: ANCHO_TELA_M, nota: "" },
    { id: "r2-wv", materialId: matId("Windows Vision"), nombre: "Windows Vision", mLineales: 10, anchoM: ANCHO_OTROS_M, nota: "" },
    { id: "r2-film-backlit", materialId: matId("Papel film backlit"), nombre: "Papel film backlit", mLineales: 30, anchoM: ANCHO_OTROS_M, nota: "Reservado para producto propio" },
  ];
}

function migrateInventory(st) {
  if (st.inventoryVersion >= INVENTORY_VERSION) return st;
  return {
    ...st,
    inventoryVersion: INVENTORY_VERSION,
    rolls: seedRolls(),
    jobs: st.jobs.map((j) => ({ ...j, deducted: [] })),
  };
}

function seed() {
  return {
    v: 1,
    inventoryVersion: INVENTORY_VERSION,
    clients: [],
    materials: seedMaterials(),
    rolls: seedRolls(),
    jobs: [],
    note: "",
  };
}

function store() {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch (e) {
    return null;
  }
}

function isNum(n) {
  return typeof n === "number" && Number.isFinite(n);
}

function asStr(v, fallback) {
  return typeof v === "string" ? v : (fallback || "");
}

function asBool(v) {
  return v === true;
}

function asNumOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  if (isNum(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalize(raw) {
  if (!raw || typeof raw !== "object") return null;
  const o = raw;
  if (!Array.isArray(o.jobs) || !Array.isArray(o.materials) || !Array.isArray(o.rolls)) return null;
  const base = seed();
  const materials = o.materials.map((item, i) => {
    const m = item || {};
    const nombre = asStr(m.nombre, "Material " + (i + 1));
    return {
      id: asStr(m.id, mid(nombre)),
      nombre,
      precioM2: isNum(m.precioM2) ? m.precioM2 : 0,
      costoM2: asNumOrNull(m.costoM2),
    };
  });
  const rolls = o.rolls.map((item, i) => {
    const r = item || {};
    const materialId = asStr(r.materialId);
    const rawAnchoM = asNumOrNull(r.anchoM);
    const rawAnchoCm = asNumOrNull(r.anchoCm);
    const anchoM =
      rawAnchoM && rawAnchoM > 0
        ? rawAnchoM
        : rawAnchoCm && rawAnchoCm > 0
          ? rawAnchoCm / 100
          : defaultAnchoM(materialId);
    const rawLin = asNumOrNull(r.mLineales);
    const mLineales =
      rawLin !== null
        ? rawLin
        : isNum(r.m2) && anchoM > 0
          ? r.m2 / anchoM
          : 0;
    return {
      id: asStr(r.id, "r-" + i),
      materialId,
      nombre: asStr(r.nombre, "Rollo " + (i + 1)),
      mLineales,
      anchoM,
      nota: asStr(r.nota),
    };
  });
  const jobs = o.jobs.map((item, i) => {
    const j = item || {};
    const deductedRaw = Array.isArray(j.deducted) ? j.deducted : [];
    return {
      id: asStr(j.id, "job-" + i),
      fecha: asStr(j.fecha),
      cliente: asStr(j.cliente),
      materialId: asStr(j.materialId),
      descripcion: asStr(j.descripcion),
      m2: isNum(j.m2) ? j.m2 : 0,
      precioM2: isNum(j.precioM2) ? j.precioM2 : 0,
      total: isNum(j.total) ? j.total : 0,
      pagado: asBool(j.pagado),
      materialCliente: asBool(j.materialCliente),
      anchoCm: asNumOrNull(j.anchoCm),
      altoCm: asNumOrNull(j.altoCm),
      cantidad: isNum(j.cantidad) ? j.cantidad : 1,
      deducted: deductedRaw
        .map((d) => {
          const x = d || {};
          const mLineales = isNum(x.mLineales) ? x.mLineales : isNum(x.m2) ? x.m2 : 0;
          return { rollId: asStr(x.rollId), mLineales };
        })
        .filter((d) => d.rollId && d.mLineales),
    };
  });
  const clients = Array.isArray(o.clients)
    ? o.clients.map((c) => asStr(c)).filter(Boolean)
    : [];
  for (const j of jobs) {
    if (j.cliente && clients.indexOf(j.cliente) === -1) clients.push(j.cliente);
  }
  return migrateInventory({
    v: 1,
    inventoryVersion: isNum(o.inventoryVersion) ? o.inventoryVersion : 0,
    clients,
    materials: materials.length ? materials : base.materials,
    rolls,
    jobs,
    note: asStr(o.note, ""),
  });
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function fmtCLP(n) {
  const r = Math.round(n);
  const neg = r < 0;
  const s = Math.abs(r).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (neg ? "−$" : "$") + s;
}

function fmtM2(n) {
  const s = n.toFixed(3).replace(/\.?0+$/, "").replace(".", ",");
  return s + " m²";
}

function fmtLin(n) {
  const s = n.toFixed(3).replace(/\.?0+$/, "").replace(".", ",");
  return s + " m";
}

function fmtDate(iso) {
  const p = String(iso).split("-");
  if (p.length !== 3) return iso;
  return p[2] + "/" + p[1] + "/" + p[0];
}

function fmtLongDate() {
  const s = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  }).format(new Date());
  return s.toUpperCase();
}

function fmtMes(ym) {
  const p = String(ym).split("-");
  const m = Number(p[1]);
  if (!m || m < 1 || m > 12) return ym;
  return MESES[m - 1] + " " + p[0];
}

function parseM2(raw) {
  const t = String(raw).trim().replace(/\s/g, "").replace(/m²/gi, "").replace(/m2/gi, "");
  if (!t) return NaN;
  return Number(t.replace(",", "."));
}

function parseCLP(raw) {
  const t = String(raw).trim().replace(/\s/g, "").replace(/\$/g, "");
  if (!t) return NaN;
  if (t.indexOf(",") >= 0) return Number(t.replace(/\./g, "").replace(",", "."));
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ""));
  return Number(t);
}

function matById(materials, id) {
  return materials.find((m) => m.id === id);
}

function matName(materials, id) {
  const m = matById(materials, id);
  return m ? m.nombre : id;
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function areaRollo(r) {
  const width = r.anchoM > 0 ? r.anchoM : defaultAnchoM(r.materialId);
  return round4(r.mLineales * width);
}

function deduct(rolls, materialId, qty) {
  if (qty <= 0) return { rolls, deducted: [], ok: true };
  const targets = deductTargetMaterialIds(materialId);
  if (!targets.length) return { rolls, deducted: [], ok: true };
  const next = rolls.map((r) => Object.assign({}, r));
  const deducted = [];
  let ok = true;
  for (const targetId of targets) {
    let leftM2 = qty;
    const idxs = next
      .map((r, i) => ({ i, r }))
      .filter((x) => x.r.materialId === targetId)
      .sort((a, b) => b.r.mLineales - a.r.mLineales);
    if (!idxs.length) {
      ok = false;
      continue;
    }
    for (const item of idxs) {
      const i = item.i;
      const r = item.r;
      if (leftM2 <= 0) break;
      const width = r.anchoM > 0 ? r.anchoM : defaultAnchoM(r.materialId);
      const needLin = leftM2 / width;
      const takeLin = Math.min(r.mLineales, needLin);
      if (takeLin > 0) {
        next[i] = Object.assign({}, r, { mLineales: round4(r.mLineales - takeLin) });
        deducted.push({ rollId: r.id, mLineales: takeLin });
        leftM2 = round4(leftM2 - takeLin * width);
      }
    }
    if (leftM2 > 0.0001) {
      const last = idxs[idxs.length - 1];
      const width = next[last.i].anchoM > 0 ? next[last.i].anchoM : defaultAnchoM(next[last.i].materialId);
      const extraLin = leftM2 / width;
      next[last.i] = Object.assign({}, next[last.i], { mLineales: round4(next[last.i].mLineales - extraLin) });
      const prev = deducted.find((d) => d.rollId === last.r.id);
      if (prev) prev.mLineales = round4(prev.mLineales + extraLin);
      else deducted.push({ rollId: last.r.id, mLineales: extraLin });
    }
  }
  return { rolls: next, deducted, ok };
}

function restore(rolls, deducted) {
  if (!deducted || !deducted.length) return rolls;
  return rolls.map((r) => {
    const add = deducted.filter((d) => d.rollId === r.id).reduce((s, d) => s + d.mLineales, 0);
    return add ? Object.assign({}, r, { mLineales: round4(r.mLineales + add) }) : r;
  });
}

function jobCost(j, materials) {
  if (j.materialCliente) return 0;
  const m = matById(materials, j.materialId);
  if (!m || m.costoM2 === null) return null;
  return j.m2 * m.costoM2;
}

function periodProfit(jobs, materials) {
  const venta = jobs.reduce((s, j) => s + j.total, 0);
  let costo = 0;
  for (const j of jobs) {
    const c = jobCost(j, materials);
    if (c === null) return { venta, costo: null, ganancia: null };
    costo += c;
  }
  return { venta, costo, ganancia: venta - costo };
}

function pendingOf(st, name) {
  return st.jobs.filter((j) => j.cliente === name && !j.pagado).reduce((s, j) => s + j.total, 0);
}

function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(v) {
  if (/[";\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

function jobsCsv(st) {
  const lines = ["fecha;cliente;material;descripcion;m2;precio_m2;total;estado;material_cliente"];
  const sorted = st.jobs.slice().sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id));
  for (const j of sorted) {
    lines.push(
      [
        j.fecha,
        csvEscape(j.cliente),
        csvEscape(matName(st.materials, j.materialId)),
        csvEscape(j.descripcion),
        j.m2.toString().replace(".", ","),
        String(j.precioM2),
        String(j.total),
        j.pagado ? "Pagado" : "Pendiente",
        j.materialCliente ? "sí" : "no",
      ].join(";"),
    );
  }
  return lines.join("\n");
}

function rollCapacity(r) {
  return r.mLineales > 55 ? 100 : 50;
}

function tabTitle(tab, editId) {
  if (tab === "inicio") return "Inicio";
  if (tab === "nueva") return editId ? "Editar impresión" : "Nueva impresión";
  if (tab === "trabajos") return "Trabajos";
  if (tab === "cobros") return "Cobros";
  if (tab === "inventario") return "Inventario";
  return "Ganancia";
}

function iconSvg(name, size) {
  size = size || 18;
  const p = 'width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  if (name === "inicio") {
    return "<svg " + p + "><path d=\"M4 11.5 12 4l8 7.5\" /><path d=\"M6.5 10.5V20h11V10.5\" /></svg>";
  }
  if (name === "nueva") {
    return "<svg " + p + "><rect x=\"5\" y=\"5\" width=\"14\" height=\"14\" rx=\"3\" /><path d=\"M12 8.5v7M8.5 12h7\" /></svg>";
  }
  if (name === "trabajos") {
    return "<svg " + p + "><rect x=\"4\" y=\"4\" width=\"7\" height=\"7\" rx=\"1.2\" /><rect x=\"13\" y=\"4\" width=\"7\" height=\"7\" rx=\"1.2\" /><rect x=\"4\" y=\"13\" width=\"7\" height=\"7\" rx=\"1.2\" /><rect x=\"13\" y=\"13\" width=\"7\" height=\"7\" rx=\"1.2\" /></svg>";
  }
  if (name === "inventario") {
    return "<svg " + p + "><path d=\"M4 7.5 12 4l8 3.5-8 3.5L4 7.5Z\" /><path d=\"M4 12l8 3.5L20 12\" /><path d=\"M4 16.5 12 20l8-3.5\" /></svg>";
  }
  if (name === "cobros") {
    return "<svg " + p + "><path d=\"M7 3.5h10a1.2 1.2 0 0 1 1.2 1.2V20l-3.1-1.4L12 20l-3.1-1.4L5.8 20V4.7A1.2 1.2 0 0 1 7 3.5Z\" /><path d=\"M9 8.5h6M9 12h6M9 15.5h3.5\" /></svg>";
  }
  return "<svg " + p + "><path d=\"M4 16.5 9.5 11l3.5 3.5L20 7.5\" /><path d=\"M14 7.5h6v6\" /></svg>";
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtQty(n) {
  if (!isNum(n)) return String(n);
  const s = String(Math.round(n * 1000) / 1000);
  return s.replace(".", ",");
}

function fmtMedidas(j) {
  if (isNum(j.anchoCm) && isNum(j.altoCm) && j.anchoCm > 0 && j.altoCm > 0) {
    let s = fmtQty(j.anchoCm) + " × " + fmtQty(j.altoCm) + " cm";
    if (isNum(j.cantidad) && j.cantidad !== 1) s += " × " + fmtQty(j.cantidad);
    s += " (" + fmtM2(j.m2) + ")";
    return s;
  }
  return fmtM2(j.m2);
}

function cobroFileBase(cliente, iso) {
  const raw = String(cliente || "Cliente")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return "Cobro_" + (raw || "Cliente") + "_" + (iso || todayISO());
}

function statementJobs(st, cliente, desde, hasta) {
  return st.jobs
    .filter((j) => j.cliente === cliente && !j.pagado)
    .filter((j) => !desde || j.fecha >= desde)
    .filter((j) => !hasta || j.fecha <= hasta)
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id));
}

function statementPeriod(desde, hasta, jobs) {
  if (desde && hasta) return fmtDate(desde) + " al " + fmtDate(hasta);
  if (desde) return "Desde " + fmtDate(desde);
  if (hasta) return "Hasta " + fmtDate(hasta);
  if (!jobs || !jobs.length) return "Todos los pendientes";
  const dates = jobs.map((j) => j.fecha);
  const min = dates.reduce((a, b) => (a < b ? a : b));
  const max = dates.reduce((a, b) => (a > b ? a : b));
  if (min === max) return fmtDate(min) + " (pendientes)";
  return fmtDate(min) + " al " + fmtDate(max) + " (pendientes)";
}

function pdfSafe(s) {
  return String(s)
    .replace(/−/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

function getJsPDF() {
  const root = typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : null);
  if (root && root.jspdf && root.jspdf.jsPDF) return root.jspdf.jsPDF;
  return null;
}

function buildStatementPdf(st, opts) {
  const JsPDF = getJsPDF();
  if (!JsPDF) throw new Error("jsPDF no esta disponible");
  const cliente = opts.cliente || "";
  const jobs = statementJobs(st, cliente, opts.desde, opts.hasta);
  const total = jobs.reduce((s, j) => s + j.total, 0);
  const period = statementPeriod(opts.desde, opts.hasta, jobs);
  const emitido = opts.emitido || todayISO();
  const datosPago = String(opts.datosPago || "").trim();
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const navy = [15, 23, 42];
  const muted = [105, 115, 134];
  const line = [227, 231, 237];
  const soft = [239, 246, 255];
  const primary = [37, 99, 235];

  let y = 16;
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.roundedRect(margin, y, 10, 10, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("VS", margin + 5, y + 6.5, { align: "center" });
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFontSize(14);
  doc.text("VSolutions", margin + 13, y + 4.6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text("Control de impresiones", margin + 13, y + 9.2);
  doc.setFontSize(8);
  doc.text("Emisión", pageW - margin, y + 3.6, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(fmtDate(emitido), pageW - margin, y + 9.2, { align: "right" });

  y = 33;
  doc.setDrawColor(line[0], line[1], line[2]);
  doc.setLineWidth(0.35);
  doc.line(margin, y, pageW - margin, y);

  y = 41;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text("ESTADO DE CUENTA", margin, y);
  y += 8;
  doc.setFontSize(16);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text("Detalle de impresiones pendientes", margin, y);

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text("Cliente", margin, y);
  doc.text("Período", margin + 95, y);
  y += 5.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(pdfSafe(cliente), margin, y);
  const periodLines = doc.splitTextToSize(pdfSafe(period), pageW - margin - 95);
  doc.setFontSize(11);
  doc.text(periodLines, margin + 95, y);

  y += 10;
  const body = jobs.map((j) => [
    fmtDate(j.fecha),
    pdfSafe(j.descripcion || "-"),
    pdfSafe(matName(st.materials, j.materialId) + (j.materialCliente ? " (cliente)" : "")),
    pdfSafe(fmtMedidas(j)),
    fmtCLP(j.precioM2),
    fmtCLP(j.total),
  ]);

  if (jobs.length && typeof doc.autoTable === "function") {
    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin, bottom: 18 },
      head: [["Fecha", "Descripción", "Material", "Medidas / m²", "Precio m²", "Valor"]],
      body: body,
      foot: [[{ content: "TOTAL PENDIENTE", colSpan: 5, styles: { halign: "right", fontStyle: "bold" } }, { content: fmtCLP(total), styles: { halign: "right", fontStyle: "bold" } }]],
      showFoot: "lastPage",
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: { top: 2.3, bottom: 2.3, left: 1.5, right: 1.5 },
        textColor: navy,
        overflow: "linebreak",
        valign: "middle",
        lineColor: line,
        lineWidth: 0,
      },
      headStyles: {
        fontStyle: "bold",
        fontSize: 7.5,
        textColor: muted,
        fillColor: [245, 246, 248],
        cellPadding: { top: 2.6, bottom: 2.6, left: 1.5, right: 1.5 },
      },
      footStyles: {
        fontStyle: "bold",
        fontSize: 10,
        textColor: navy,
        fillColor: soft,
        cellPadding: { top: 3.4, bottom: 3.4, left: 1.5, right: 1.5 },
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 40 },
        2: { cellWidth: 34 },
        3: { cellWidth: 36 },
        4: { cellWidth: 24, halign: "right" },
        5: { cellWidth: 24, halign: "right" },
      },
      didDrawPage: function () {
        doc.setDrawColor(line[0], line[1], line[2]);
        doc.setLineWidth(0.3);
        doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(muted[0], muted[1], muted[2]);
        doc.text("VSolutions", margin, pageH - 9);
      },
    });
  } else if (!jobs.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text("No hay impresiones pendientes en este período.", margin, y + 8);
    doc.setDrawColor(line[0], line[1], line[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
    doc.setFontSize(8);
    doc.text("VSolutions", margin, pageH - 9);
  }

  let afterY = jobs.length && doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : y + 20;
  const pagoLines = datosPago ? doc.splitTextToSize(pdfSafe(datosPago), pageW - margin * 2) : [];
  const pagoH = datosPago ? 6 + pagoLines.length * 4.4 + 8 : 0;
  if (afterY + pagoH + 10 > pageH - 18) {
    doc.addPage();
    doc.setDrawColor(line[0], line[1], line[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text("VSolutions", margin, pageH - 9);
    afterY = 20;
  }
  if (datosPago) {
    doc.setFillColor(250, 251, 252);
    doc.setDrawColor(line[0], line[1], line[2]);
    const boxH = 8 + pagoLines.length * 4.4;
    doc.roundedRect(margin, afterY - 4, pageW - margin * 2, boxH, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text("Datos de pago", margin + 3, afterY + 1.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(pagoLines, margin + 3, afterY + 6.5);
    afterY += boxH + 8;
  }
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text("Gracias por su preferencia", margin, afterY);

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text("Página " + i + " de " + totalPages, pageW - margin, pageH - 9, { align: "right" });
  }
  return doc.output("blob");
}

function statementHtml(st, opts) {
  const cliente = opts.cliente || "";
  const jobs = statementJobs(st, cliente, opts.desde, opts.hasta);
  const total = jobs.reduce((s, j) => s + j.total, 0);
  const period = statementPeriod(opts.desde, opts.hasta, jobs);
  const emitido = opts.emitido || todayISO();
  let rows = "";
  for (const j of jobs) {
    rows += "<tr>" +
      "<td>" + esc(fmtDate(j.fecha)) + "</td>" +
      "<td>" + esc(j.descripcion || "—") + "</td>" +
      "<td>" + esc(matName(st.materials, j.materialId) + (j.materialCliente ? " (cliente)" : "")) + "</td>" +
      "<td>" + esc(fmtMedidas(j)) + "</td>" +
      '<td class="vs-num">' + esc(fmtCLP(j.precioM2)) + "</td>" +
      '<td class="vs-num">' + esc(fmtCLP(j.total)) + "</td>" +
      "</tr>";
  }
  const pago = String(opts.datosPago || "").trim();
  const pagoBlock = pago
    ? '<div class="vs-st-pago"><p class="vs-st-pago-label">Datos de pago</p><p class="vs-st-pago-text">' + esc(pago) + "</p></div>"
    : "";
  const table = jobs.length
    ? '<table class="vs-st-table"><thead><tr><th>Fecha</th><th>Descripción</th><th>Material</th><th>Medidas / m²</th><th class="vs-num">Precio m²</th><th class="vs-num">Valor</th></tr></thead><tbody>' + rows + '</tbody><tfoot><tr><th colspan="5">Total pendiente</th><th class="vs-num">' + esc(fmtCLP(total)) + "</th></tr></tfoot></table>"
    : '<p class="vs-st-empty">No hay impresiones pendientes en este período.</p>';
  return (
    '<article class="vs-statement" id="vs-statement">' +
      '<header class="vs-st-head">' +
        '<div class="vs-st-brand"><span class="vs-mark">VS</span><div><strong>VSolutions</strong><small>Control de impresiones</small></div></div>' +
        '<div class="vs-st-meta"><span>Emisión</span><strong>' + esc(fmtDate(emitido)) + "</strong></div>" +
      "</header>" +
      '<p class="vs-st-kicker">Estado de cuenta</p>' +
      "<h2>Detalle de impresiones pendientes</h2>" +
      '<div class="vs-st-info">' +
        "<div><span>Cliente</span><strong>" + esc(cliente) + "</strong></div>" +
        "<div><span>Período</span><strong>" + esc(period) + "</strong></div>" +
      "</div>" +
      table +
      pagoBlock +
      '<p class="vs-st-thanks">Gracias por su preferencia</p>' +
    "</article>"
  );
}

const api = {
  KEY, INVENTORY_VERSION, PAGO_KEY, seed, normalize, seedMaterials, seedRolls,
  matId, mid, pendingOf, deduct, restore, fmtCLP, periodProfit, jobsCsv,
  fmtMedidas, cobroFileBase, statementJobs, statementPeriod, buildStatementPdf, statementHtml,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

/* ---------- UI (solo en el navegador) ---------- */
if (typeof window !== "undefined" && typeof document !== "undefined") {
  let data = seed();
  let ready = false;
  let persistOk = true;
  let tab = "inicio";
  let msg = "";
  let filtroCliente = "todos";
  let filtroEstado = "todos";
  let confirmDel = "";
  let confirmPay = "";
  let confirmCobro = false;
  let cobroCliente = "";
  let cobroDesde = "";
  let cobroHasta = "";
  let datosPago = "";
  let confirmImport = false;
  let pendingImport = null;
  let drafts = {};
  let form = defaultForm();
  let matNombre = "";
  let matPrecio = "";
  let matCosto = "";
  let rollNombre = "";
  let rollMat = matId("Adhesivo");
  let rollM2 = "";
  let rollAncho = "";
  let bound = false;

  function defaultForm() {
    return {
      editId: null,
      fecha: todayISO(),
      cliente: "",
      nuevoCliente: "",
      materialId: matId("Adhesivo"),
      descripcion: "",
      modo: "medidas",
      ancho: "",
      alto: "",
      cantidad: "1",
      m2Directo: "",
      precioStr: "6000",
      totalStr: "",
      totalLocked: false,
      materialCliente: false,
    };
  }

  function resetForm() {
    form = defaultForm();
    form.cliente = data.clients[0] || "";
    const first = data.materials[0];
    form.materialId = first ? first.id : matId("Adhesivo");
    form.precioStr = String(first ? first.precioM2 : 6000);
    form.materialCliente = defaultsMaterialCliente(form.materialId);
  }

  function persist() {
    if (!ready || !persistOk) return;
    try {
      const s = store();
      if (s) s.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      persistOk = false;
    }
  }

  function setData(next) {
    data = next;
    persist();
    render();
  }

  function setMsg(text) {
    msg = text;
    render();
  }

  function m2Calc() {
    if (form.modo === "m2") return parseM2(form.m2Directo);
    const w = parseM2(form.ancho);
    const h = parseM2(form.alto);
    const c = parseM2(form.cantidad);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return NaN;
    const qty = Number.isFinite(c) && c > 0 ? c : 1;
    return round4((w / 100) * (h / 100) * qty);
  }

  function autoTotal() {
    const m2 = m2Calc();
    const precioNum = parseCLP(form.precioStr);
    return Number.isFinite(m2) && Number.isFinite(precioNum) ? Math.round(m2 * precioNum) : NaN;
  }

  function syncAutoTotal() {
    if (form.totalLocked) return;
    const t = autoTotal();
    if (Number.isFinite(t)) form.totalStr = String(t);
  }

  function pendientesMap() {
    const map = {};
    for (const c of data.clients) map[c] = { total: 0, n: 0 };
    for (const j of data.jobs) {
      if (!j.pagado) {
        if (!map[j.cliente]) map[j.cliente] = { total: 0, n: 0 };
        map[j.cliente].total += j.total;
        map[j.cliente].n += 1;
      }
    }
    return map;
  }

  function btn(label, act, kind, extra) {
    const cls = "vs-btn " + (kind === "primary" ? "vs-btn-primary" : kind === "danger" ? "vs-btn-danger" : "vs-btn-sec") + (extra && extra.block ? " vs-btn-block" : "");
    const attrs = extra && extra.attrs ? " " + extra.attrs : "";
    return '<button type="button" class="' + cls + '" data-act="' + esc(act) + '"' + attrs + ">" + esc(label) + "</button>";
  }

  function pill(pagado, id) {
    const cls = "vs-pill " + (pagado ? "vs-pill-ok" : "vs-pill-warn");
    const label = pagado ? "Pagado" : "Pendiente";
    if (id) {
      return '<button type="button" class="' + cls + '" data-act="toggle-pago" data-id="' + esc(id) + '" aria-label="' + label + '">' + label + "</button>";
    }
    return '<span class="' + cls + '">' + label + "</span>";
  }

  function field(label, inner) {
    return '<label class="vs-field">' + esc(label) + inner + "</label>";
  }

  function alertsHtml() {
    let html = "";
    if (msg) html += '<div class="' + (confirmImport ? "vs-msg vs-msg-warn" : "vs-msg vs-msg-ok") + '">' + esc(msg) + "</div>";
    if (!persistOk) {
      html += '<div class="vs-msg vs-msg-warn">Este navegador no dejó guardar en el dispositivo. Puedes usar Exportar JSON para no perder los datos.</div>';
    } else if (tab === "inicio") {
      html += '<div class="vs-msg vs-msg-ok">Cada cambio queda en este iPad o computador. Haz un respaldo con Exportar JSON de vez en cuando.</div>';
    }
    return html;
  }

  function renderInicio() {
    const mesActual = todayISO().slice(0, 7);
    const jobsMes = data.jobs.filter((j) => j.fecha.slice(0, 7) === mesActual);
    const profitMes = periodProfit(jobsMes, data.materials);
    const pendientes = pendientesMap();
    const totalPendiente = Object.keys(pendientes).reduce((s, k) => s + pendientes[k].total, 0);
    const m2Mes = jobsMes.reduce((s, j) => s + j.m2, 0);
    const invM2 = data.rolls.reduce((s, r) => s + areaRollo(r), 0);
    const lowRolls = data.rolls.filter((r) => r.mLineales > 0 && r.mLineales < 10).length;
    const recientes = data.jobs.slice().sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id)).slice(0, 8);

    let recHtml;
    if (recientes.length === 0) {
      recHtml = '<div class="vs-empty">Las nuevas impresiones aparecerán aquí.</div>';
    } else {
      recHtml = "<div>" + recientes.map((j) => {
        return '<article class="vs-job">' +
          '<div class="vs-job-top"><span>' + esc(fmtDate(j.fecha)) + "</span>" + pill(j.pagado, j.id) + "</div>" +
          "<strong>" + esc(j.descripcion || matName(data.materials, j.materialId)) + "</strong>" +
          "<span>" + esc(j.cliente) + " · " + esc(matName(data.materials, j.materialId)) + (j.materialCliente ? " · material del cliente" : "") + "</span>" +
          '<div class="vs-job-vals"><span>' + esc(fmtM2(j.m2)) + "</span><strong>" + esc(fmtCLP(j.total)) + "</strong></div>" +
          "</article>";
      }).join("") + "</div>";
    }

    let balHtml;
    if (!data.clients.length) {
      balHtml = '<div class="vs-empty">Aún no hay clientes. Importa un respaldo o agrega uno al registrar una impresión.</div>';
    } else {
      balHtml = '<div class="vs-bal">' + data.clients.map((c) => {
        const p = pendientes[c] || { total: 0, n: 0 };
        return "<div><span><strong>" + esc(c) + "</strong><small>" + (p.total > 0 ? "Saldo pendiente" : "Al día") + '</small></span><strong class="vs-amt">' + esc(fmtCLP(p.total)) + "</strong></div>";
      }).join("") + "</div>";
    }

    const importBtns = confirmImport
      ? btn("Confirmar importación", "confirm-import", "primary") + btn("Cancelar importación", "cancel-import", "sec")
      : btn("Importar JSON", "import-json", "sec");

    return (
      '<section class="vs-metrics">' +
        '<button type="button" class="vs-kpi" data-act="tab" data-tab="trabajos"><span>Trabajos del mes</span><strong>' + jobsMes.length + " trabajos</strong><small>" + esc(fmtM2(m2Mes)) + "</small></button>" +
        '<button type="button" class="vs-kpi" data-act="tab" data-tab="ganancia"><span>Venta del mes</span><strong>' + esc(fmtCLP(profitMes.venta)) + "</strong><small>" + esc(fmtCLP(totalPendiente)) + " pendiente total</small></button>" +
        '<button type="button" class="vs-kpi" data-act="tab" data-tab="inventario"><span>Inventario disponible</span><strong>' + esc(fmtM2(invM2)) + "</strong><small>" + (lowRolls ? lowRolls + " rollos con nivel bajo" : data.rolls.length + " rollos") + "</small></button>" +
      "</section>" +
      '<div class="vs-dash">' +
        '<section class="vs-card vs-card-pad"><div class="vs-head"><div><p class="vs-eyebrow">Recientes</p><h2>Trabajos recientes</h2></div><span class="vs-count">' + recientes.length + "</span></div>" + recHtml + "</section>" +
        '<section class="vs-card vs-card-pad"><div class="vs-head"><div><p class="vs-eyebrow">Por cobrar</p><h2>Saldos por cliente</h2></div></div>' + balHtml + btn("Ver trabajos", "tab", "sec", { block: true, attrs: 'data-tab="trabajos"' }) + "</section>" +
      "</div>" +
      '<div class="vs-actions">' +
        btn("+ Registrar impresión", "nueva", "primary") +
        btn("Exportar JSON", "export-json", "sec") +
        btn("Exportar CSV", "export-csv", "sec") +
        importBtns +
      "</div>" +
      (data.note ? '<p class="vs-note">' + esc(data.note) + "</p>" : "")
    );
  }

  function renderNueva() {
    const m2 = m2Calc();
    const precioNum = parseCLP(form.precioStr);
    const auto = autoTotal();
    const totalShown = form.totalStr ? fmtCLP(parseCLP(form.totalStr) || 0) : (Number.isFinite(auto) ? fmtCLP(auto) : "—");
    const clientOpts = (data.clients.length
      ? data.clients.map((c) => '<option value="' + esc(c) + '"' + (form.cliente === c ? " selected" : "") + ">" + esc(c) + "</option>").join("")
      : '<option value="">Agrega un cliente</option>');
    const matOpts = data.materials.map((m) =>
      '<option value="' + esc(m.id) + '"' + (form.materialId === m.id ? " selected" : "") + ">" + esc(m.nombre) + " · " + esc(fmtCLP(m.precioM2)) + "/m²</option>"
    ).join("");
    const medidas = form.modo === "medidas"
      ? '<div class="vs-grid-3">' +
          field("Ancho (cm)", '<input id="f-ancho" data-field="ancho" value="' + esc(form.ancho) + '" inputmode="decimal" placeholder="80">') +
          field("Alto (cm)", '<input id="f-alto" data-field="alto" value="' + esc(form.alto) + '" inputmode="decimal" placeholder="37">') +
          field("Cantidad", '<input id="f-cant" data-field="cantidad" value="' + esc(form.cantidad) + '" inputmode="decimal" placeholder="1">') +
        "</div>"
      : field("m²", '<input id="f-m2" data-field="m2Directo" value="' + esc(form.m2Directo) + '" inputmode="decimal" placeholder="3,625">');

    return (
      '<section class="vs-card vs-card-pad">' +
        '<div class="vs-head"><div><p class="vs-eyebrow">Ingreso manual</p><h2>' + (form.editId ? "Editar trabajo recibido" : "Registrar trabajo recibido") + "</h2></div>" +
        (form.editId ? btn("Cancelar edición", "cancel-edit", "sec") : "") +
        "</div>" +
        '<div class="vs-form">' +
          '<div class="vs-grid-2">' +
            field("Fecha", '<input id="f-fecha" data-field="fecha" type="date" value="' + esc(form.fecha) + '">') +
            field("Cliente", '<select id="f-cliente" data-field="cliente">' + clientOpts + "</select>") +
          "</div>" +
          '<div class="vs-grid-2">' +
            field("Nuevo cliente", '<input id="f-nuevo" data-field="nuevoCliente" value="' + esc(form.nuevoCliente) + '" placeholder="Nombre">') +
            '<div class="vs-add-client-row">' + btn("Agregar cliente", "add-client", "sec") + "</div>" +
          "</div>" +
          field("Material", '<select id="f-mat" data-field="materialId">' + matOpts + "</select>") +
          field("Descripción", '<input id="f-desc" data-field="descripcion" value="' + esc(form.descripcion) + '" placeholder="Trabajo, medida o nota">') +
          '<div class="vs-seg">' +
            '<button type="button" class="' + (form.modo === "medidas" ? "vs-on" : "") + '" data-act="modo" data-modo="medidas">Ancho × alto</button>' +
            '<button type="button" class="' + (form.modo === "m2" ? "vs-on" : "") + '" data-act="modo" data-modo="m2">m² directo</button>' +
          "</div>" +
          medidas +
          '<div class="vs-calc">' +
            "<div><span>Superficie</span><strong>" + (Number.isFinite(m2) ? esc(fmtM2(m2)) : "—") + "</strong></div>" +
            "<div><span>Precio / m²</span><strong>" + (Number.isFinite(precioNum) ? esc(fmtCLP(precioNum)) : "—") + "</strong></div>" +
            '<div class="vs-calc-total"><span>Total</span><strong>' + esc(totalShown) + "</strong></div>" +
          "</div>" +
          '<div class="vs-grid-2">' +
            field("Precio por m²", '<input id="f-precio" data-field="precioStr" value="' + esc(form.precioStr) + '" inputmode="decimal">') +
            field("Total", '<input id="f-total" data-field="totalStr" data-lock="1" value="' + esc(form.totalStr) + '" inputmode="decimal">') +
          "</div>" +
          '<label class="vs-check"><input id="f-cli-mat" type="checkbox" data-field="materialCliente"' + (form.materialCliente ? " checked" : "") + "> Material del cliente (no descontar del inventario)</label>" +
          '<div class="vs-actions" style="margin-top:8px">' + btn(form.editId ? "Guardar cambios" : "Guardar impresión", "guardar", "primary") + "</div>" +
        "</div>" +
      "</section>"
    );
  }

  function renderTrabajos() {
    const filtrados = data.jobs
      .filter((j) => (filtroCliente === "todos" ? true : j.cliente === filtroCliente))
      .filter((j) => filtroEstado === "todos" ? true : filtroEstado === "pagado" ? j.pagado : !j.pagado)
      .slice()
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));

    const clientOpts = '<option value="todos">Todos</option>' + data.clients.map((c) =>
      '<option value="' + esc(c) + '"' + (filtroCliente === c ? " selected" : "") + ">" + esc(c) + "</option>"
    ).join("");

    const segs = ["todos", "pendiente", "pagado"].map((v) => {
      const label = v === "todos" ? "Todos" : v === "pendiente" ? "Pendiente" : "Pagado";
      return '<button type="button" class="' + (filtroEstado === v ? "vs-on" : "") + '" data-act="filtro-estado" data-val="' + v + '">' + label + "</button>";
    }).join("");

    const groups = (filtroCliente === "todos" ? data.clients : [filtroCliente]);
    let body = groups.map((cli) => {
      const rows = filtrados.filter((j) => j.cliente === cli);
      if (!rows.length) return "";
      const pend = rows.filter((j) => !j.pagado);
      const sumaPend = pend.reduce((s, j) => s + j.total, 0);
      const payBtn = pend.length
        ? btn(confirmPay === cli ? "¿Confirmar pago?" : "Marcar todo pagado", "pagar-todo", confirmPay === cli ? "primary" : "sec", { attrs: 'data-cli="' + esc(cli) + '"' })
        : "";
      const trs = rows.map((j) => {
        const det = j.descripcion || (j.anchoCm && j.altoCm ? j.anchoCm + "×" + j.altoCm + " cm" : "—");
        return "<tr><td>" + esc(fmtDate(j.fecha)) + "</td><td>" + esc(matName(data.materials, j.materialId)) + (j.materialCliente ? " (cliente)" : "") + "</td><td>" + esc(det) + '</td><td class="vs-num">' + esc(fmtM2(j.m2)) + '</td><td class="vs-num">' + esc(fmtCLP(j.total)) + "</td><td>" + pill(j.pagado, j.id) + '</td><td><div class="vs-row-actions">' +
          btn("Editar", "editar", "sec", { attrs: 'data-id="' + esc(j.id) + '"' }) +
          btn(confirmDel === j.id ? "¿Borrar?" : "Borrar", "borrar", "danger", { attrs: 'data-id="' + esc(j.id) + '"' }) +
          "</div></td></tr>";
      }).join("");
      return (
        '<section class="vs-card vs-card-pad">' +
          '<div class="vs-head"><div><p class="vs-eyebrow">' + (pend.length ? pend.length + " pendientes · " + esc(fmtCLP(sumaPend)) : "Nada pendiente en esta vista") + "</p><h2>" + esc(cli) + "</h2></div>" + payBtn + "</div>" +
          '<div class="vs-table-wrap"><table class="vs-table"><thead><tr><th>Fecha</th><th>Material</th><th>Detalle</th><th class="vs-num">m²</th><th class="vs-num">Total</th><th>Estado</th><th class="vs-num">Acciones</th></tr></thead><tbody>' + trs + "</tbody></table></div>" +
        "</section>"
      );
    }).join("");

    if (!filtrados.length) {
      body += '<div class="vs-empty">No hay trabajos con ese filtro.</div>';
    }

    return (
      '<div class="vs-stack">' +
        '<section class="vs-card vs-card-pad">' +
          '<div class="vs-head"><div><p class="vs-eyebrow">Listado</p><h2>' + filtrados.length + " en esta vista</h2></div>" +
          btn("+ Registrar impresión", "nueva", "primary") +
          "</div>" +
          '<div class="vs-toolbar">' +
            field("Cliente", '<select id="filtro-cliente" data-field="filtroCliente">' + clientOpts + "</select>") +
            '<div class="vs-seg">' + segs + "</div>" +
          "</div>" +
        "</section>" +
        body +
      "</div>"
    );
  }

  function renderInventario() {
    const matRows = data.materials.map((m) => {
      const pVal = drafts[m.id + "-p"] != null ? drafts[m.id + "-p"] : String(m.precioM2);
      const cVal = drafts[m.id + "-c"] != null ? drafts[m.id + "-c"] : (m.costoM2 === null ? "" : String(m.costoM2));
      return "<tr><td>" + esc(m.nombre) + '</td><td class="vs-num"><input class="vs-mat-input" id="mat-p-' + esc(m.id) + '" data-mat-precio="' + esc(m.id) + '" value="' + esc(pVal) + '" inputmode="decimal"></td><td class="vs-num"><input class="vs-mat-input" id="mat-c-' + esc(m.id) + '" data-mat-costo="' + esc(m.id) + '" value="' + esc(cVal) + '" placeholder="sin costo" inputmode="decimal"></td></tr>';
    }).join("");

    const matOpts = data.materials.map((m) =>
      '<option value="' + esc(m.id) + '"' + (rollMat === m.id ? " selected" : "") + ">" + esc(m.nombre) + "</option>"
    ).join("");

    const rolls = data.rolls.map((r) => {
      const cap = rollCapacity(r);
      const pct = cap > 0 ? Math.max(0, Math.min(100, (r.mLineales / cap) * 100)) : 0;
      const low = r.mLineales <= 0;
      const warn = r.mLineales > 0 && r.mLineales < 10;
      const m2Disp = areaRollo(r);
      const mVal = drafts[r.id + "-m"] != null ? drafts[r.id + "-m"] : String(r.mLineales).replace(".", ",");
      const wVal = drafts[r.id + "-w"] != null ? drafts[r.id + "-w"] : String(r.anchoM).replace(".", ",");
      const st = low ? "Sin stock" : warn ? "Bajo" : "Ok";
      const pillCls = low ? "vs-pill-bad" : warn ? "vs-pill-warn" : "vs-pill-ok";
      const trackCls = low ? " vs-empty" : warn ? " vs-low" : "";
      return (
        '<article class="vs-roll">' +
          '<div class="vs-roll-h"><span class="vs-roll-icon"></span><span><strong>' + esc(r.nombre) + "</strong><small>" + esc(matName(data.materials, r.materialId)) + " · " + esc(fmtLin(r.anchoM)) + ' de ancho</small></span><span class="vs-pill ' + pillCls + '" style="margin-left:auto">' + st + "</span></div>" +
          '<div class="vs-track' + trackCls + '"><span style="width:' + pct + '%"></span></div>' +
          '<div class="vs-roll-vals">' +
            "<span><small>Metros lineales</small><input class=\"vs-mat-input\" id=\"roll-m-" + esc(r.id) + "\" data-roll-m=\"" + esc(r.id) + "\" value=\"" + esc(mVal) + "\" inputmode=\"decimal\"></span>" +
            "<span><small>Ancho (m)</small><input class=\"vs-mat-input\" id=\"roll-w-" + esc(r.id) + "\" data-roll-w=\"" + esc(r.id) + "\" value=\"" + esc(wVal) + "\" inputmode=\"decimal\"></span>" +
            "<span><small>Disponible</small><strong>" + esc(fmtM2(m2Disp)) + "</strong></span>" +
          "</div>" +
          (r.nota ? '<span class="vs-roll-note">' + esc(r.nota) + "</span>" : "") +
        "</article>"
      );
    }).join("");

    return (
      '<div class="vs-stack">' +
        '<section class="vs-card vs-card-pad">' +
          '<div class="vs-head"><div><p class="vs-eyebrow">Precios</p><h2>Materiales</h2></div></div>' +
          '<p class="vs-note" style="margin-top:0;margin-bottom:16px">El costo por m² es opcional. Sin él, la ganancia aparece como “sin costo”.</p>' +
          '<div class="vs-table-wrap"><table class="vs-table"><thead><tr><th>Material</th><th class="vs-num">Venta / m²</th><th class="vs-num">Costo / m²</th></tr></thead><tbody>' + matRows + "</tbody></table></div>" +
        "</section>" +
        '<section class="vs-card vs-card-pad">' +
          '<div class="vs-head"><div><p class="vs-eyebrow">Catálogo</p><h2>Agregar material</h2></div></div>' +
          '<div class="vs-form"><div class="vs-grid-3">' +
            field("Nombre", '<input id="mat-nombre" data-aux="matNombre" value="' + esc(matNombre) + '" placeholder="Ej. Lona mesh">') +
            field("Precio venta / m²", '<input id="mat-precio-new" data-aux="matPrecio" value="' + esc(matPrecio) + '" inputmode="decimal">') +
            field("Costo / m²", '<input id="mat-costo-new" data-aux="matCosto" value="' + esc(matCosto) + '" inputmode="decimal" placeholder="Opcional">') +
          "</div>" + btn("Agregar material", "add-material", "sec") + "</div>" +
        "</section>" +
        "<section>" +
          '<div class="vs-head"><div><p class="vs-eyebrow">Stock</p><h2>Rollos</h2></div></div>' +
          '<p class="vs-note" style="margin-top:0;margin-bottom:16px">Los metros lineales bajan al guardar una impresión (m² ÷ ancho del rollo), salvo que marques “material del cliente”. Las telas son de 1,60 m de ancho y el resto de 1,52 m; puedes corregir metros y ancho en cada rollo. Los trabajos importados no vuelven a descontar el inventario, salvo que los edites y los vuelvas a guardar.</p>' +
          '<div class="vs-rolls">' + rolls + "</div>" +
        "</section>" +
        '<section class="vs-card vs-card-pad">' +
          '<div class="vs-head"><div><p class="vs-eyebrow">Nuevo stock</p><h2>Agregar rollo</h2></div></div>' +
          '<div class="vs-form">' +
            field("Material", '<select id="roll-mat" data-aux="rollMat">' + matOpts + "</select>") +
            '<div class="vs-grid-3">' +
              field("Nombre del rollo", '<input id="roll-nombre" data-aux="rollNombre" value="' + esc(rollNombre) + '" placeholder="Ej. ADH glossy">') +
              field("Metros lineales", '<input id="roll-lin" data-aux="rollM2" value="' + esc(rollM2) + '" inputmode="decimal">') +
              field("Ancho (m)", '<input id="roll-ancho" data-aux="rollAncho" value="' + esc(rollAncho) + '" inputmode="decimal" placeholder="' + esc(String(defaultAnchoM(rollMat)).replace(".", ",")) + '">') +
            "</div>" + btn("Agregar rollo", "add-roll", "sec") +
          "</div>" +
        "</section>" +
      "</div>"
    );
  }

  function renderGanancia() {
    const keys = {};
    for (const j of data.jobs) keys[j.fecha.slice(0, 7)] = true;
    const meses = Object.keys(keys).sort().reverse();
    const rows = meses.map((ym) => {
      const list = data.jobs.filter((j) => j.fecha.slice(0, 7) === ym);
      const p = periodProfit(list, data.materials);
      const m2 = list.reduce((s, j) => s + j.m2, 0);
      return "<tr><td>" + esc(fmtMes(ym)) + '</td><td class="vs-num">' + esc(fmtCLP(p.venta)) + '</td><td class="vs-num">' + (p.costo === null ? "sin costo" : esc(fmtCLP(p.costo))) + '</td><td class="vs-num">' + (p.ganancia === null ? "sin costo" : esc(fmtCLP(p.ganancia))) + '</td><td class="vs-num">' + esc(fmtM2(m2)) + "</td></tr>";
    }).join("");
    const empty = meses.length ? "" : '<tr><td colspan="5" class="vs-muted">Aún no hay trabajos para calcular ganancia.</td></tr>';
    const note = data.note
      ? '<p class="vs-note">' + esc(data.note) + ". Ese historial no entra en las cifras de arriba porque no está desglosado por mes en la app.</p>"
      : "";
    return (
      '<section class="vs-card vs-card-pad">' +
        '<div class="vs-head"><div><p class="vs-eyebrow">Resultado</p><h2>Ganancia por mes</h2></div></div>' +
        '<p class="vs-note" style="margin-top:0;margin-bottom:16px">La ganancia estimada aparece cuando todos los materiales usados en el mes tienen su costo por m². El material del cliente cuenta como costo 0.</p>' +
        '<div class="vs-table-wrap"><table class="vs-table"><thead><tr><th>Mes</th><th class="vs-num">Venta</th><th class="vs-num">Costo material</th><th class="vs-num">Ganancia estimada</th><th class="vs-num">m²</th></tr></thead><tbody>' + (rows || empty) + "</tbody></table></div>" +
        note +
      "</section>"
    );
  }

  function renderCobros() {
    const pend = pendientesMap();
    const withPend = data.clients.filter((c) => pend[c] && pend[c].total > 0);
    if (!cobroCliente) cobroCliente = withPend[0] || data.clients[0] || "";
    const clientOpts = data.clients.map((c) => {
      const p = pend[c] || { total: 0, n: 0 };
      const label = c + (p.total > 0 ? " · " + fmtCLP(p.total) : " · al día");
      return '<option value="' + esc(c) + '"' + (cobroCliente === c ? " selected" : "") + ">" + esc(label) + "</option>";
    }).join("");
    const jobs = cobroCliente ? statementJobs(data, cobroCliente, cobroDesde, cobroHasta) : [];
    const total = jobs.reduce((sum, j) => sum + j.total, 0);
    const disabled = jobs.length ? "" : " disabled";
    const payLabel = confirmCobro ? "¿Confirmar cobro?" : "Marcar como cobrado/pagado";
    const actions =
      btn("Descargar PDF", "cobro-pdf", "primary", { attrs: disabled }) +
      btn("Descargar imagen PNG", "cobro-png", "sec", { attrs: disabled }) +
      btn("Compartir", "cobro-share", "sec", { attrs: disabled }) +
      (jobs.length ? btn(payLabel, "cobro-pagar", confirmCobro ? "primary" : "sec") : "");
    const emptyClients = !data.clients.length
      ? '<div class="vs-empty">Agrega un cliente o importa un respaldo para armar un cobro.</div>'
      : '<div class="vs-statement-wrap">' + statementHtml(data, { cliente: cobroCliente, desde: cobroDesde, hasta: cobroHasta, emitido: todayISO(), datosPago: datosPago }) + "</div>";
    return (
      '<div class="vs-stack">' +
        '<section class="vs-card vs-card-pad">' +
          '<div class="vs-head"><div><p class="vs-eyebrow">Estado de cuenta</p><h2>Armar un cobro</h2></div></div>' +
          '<div class="vs-toolbar">' +
            field("Cliente", '<select id="cobro-cliente" data-field="cobroCliente">' + (clientOpts || '<option value="">Sin clientes</option>') + "</select>") +
            field("Desde (opcional)", '<input id="cobro-desde" type="date" data-field="cobroDesde" value="' + esc(cobroDesde) + '">') +
            field("Hasta (opcional)", '<input id="cobro-hasta" type="date" data-field="cobroHasta" value="' + esc(cobroHasta) + '">') +
          "</div>" +
          '<div class="vs-actions">' + actions + "</div>" +
          (jobs.length ? '<p class="vs-cobro-hint">' + jobs.length + (jobs.length === 1 ? " impresión pendiente" : " impresiones pendientes") + " · " + esc(fmtCLP(total)) + "</p>" : '<p class="vs-cobro-hint">Elige un cliente. Si no filtras fechas, se incluyen todos los pendientes.</p>') +
        "</section>" +
        '<section class="vs-card vs-card-pad">' +
          '<div class="vs-head"><div><p class="vs-eyebrow">Datos de pago</p><h2>Qué verá el cliente</h2></div></div>' +
          field("Texto al pie del cobro (banco, cuenta, RUT, email…)", '<textarea id="datos-pago" data-aux="datosPago" rows="4" placeholder="Ej.: Banco Estado&#10;Cuenta vista 00000000&#10;RUT 00.000.000-0&#10;Email contacto@ejemplo.cl">' + esc(datosPago) + "</textarea>") +
          '<p class="vs-muted">Se guarda en este dispositivo. Si lo dejas vacío, el cobro solo lleva la nota de agradecimiento.</p>' +
        "</section>" +
        emptyClients +
      "</div>"
    );
  }

  function cobroOpts() {
    return {
      cliente: cobroCliente,
      desde: cobroDesde,
      hasta: cobroHasta,
      emitido: todayISO(),
      datosPago: datosPago,
    };
  }

  function cobroFilename(ext) {
    return cobroFileBase(cobroCliente, todayISO()) + "." + ext;
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function saveDatosPago(text) {
    datosPago = text;
    try {
      const st = store();
      if (st) st.setItem(PAGO_KEY, text);
    } catch (e) {}
  }

  function loadDatosPago() {
    try {
      const st = store();
      datosPago = st ? (st.getItem(PAGO_KEY) || "") : "";
    } catch (e) {
      datosPago = "";
    }
  }

  function updatePagoPreview() {
    const stEl = document.getElementById("vs-statement");
    if (!stEl) return;
    const thanks = stEl.querySelector(".vs-st-thanks");
    let box = stEl.querySelector(".vs-st-pago");
    const text = String(datosPago || "").trim();
    if (text) {
      if (!box) {
        box = document.createElement("div");
        box.className = "vs-st-pago";
        box.innerHTML = '<p class="vs-st-pago-label">Datos de pago</p><p class="vs-st-pago-text"></p>';
        stEl.insertBefore(box, thanks);
      }
      box.querySelector(".vs-st-pago-text").textContent = datosPago;
    } else if (box) {
      box.remove();
    }
  }

  async function buildStatementPng() {
    const el = document.getElementById("vs-statement");
    if (!el || !window.html2canvas) throw new Error("No hay vista del cobro");
    const canvas = await window.html2canvas(el, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
    return await new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) { b ? resolve(b) : reject(new Error("PNG")); }, "image/png");
    });
  }

  async function descargarCobroPdf() {
    const jobs = statementJobs(data, cobroCliente, cobroDesde, cobroHasta);
    if (!jobs.length) return;
    try {
      const blob = buildStatementPdf(data, cobroOpts());
      downloadBlob(cobroFilename("pdf"), blob);
      setMsg("Descargué el PDF del cobro.");
    } catch (err) {
      setMsg("No pude generar el PDF.");
    }
  }

  async function descargarCobroPng() {
    const jobs = statementJobs(data, cobroCliente, cobroDesde, cobroHasta);
    if (!jobs.length) return;
    try {
      const blob = await buildStatementPng();
      downloadBlob(cobroFilename("png"), blob);
      setMsg("Descargué la imagen del cobro.");
    } catch (err) {
      setMsg("No pude generar la imagen.");
    }
  }

  async function compartirCobro() {
    const jobs = statementJobs(data, cobroCliente, cobroDesde, cobroHasta);
    if (!jobs.length) return;
    try {
      const blob = buildStatementPdf(data, cobroOpts());
      const filename = cobroFilename("pdf");
      const file = new File([blob], filename, { type: "application/pdf" });
      const title = "Cobro " + cobroCliente;
      const text = "Estado de cuenta de " + cobroCliente;
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: title, text: text });
        setMsg("Listo, ya puedes enviarlo al cliente.");
        return;
      }
      if (typeof navigator.share === "function") {
        await navigator.share({ files: [file], title: title, text: text });
        setMsg("Listo, ya puedes enviarlo al cliente.");
        return;
      }
      downloadBlob(filename, blob);
      setMsg("Este dispositivo no permite compartir el archivo. Descargué el PDF para que lo envíes tú.");
    } catch (err) {
      if (err && err.name === "AbortError") return;
      try {
        const blob = buildStatementPdf(data, cobroOpts());
        downloadBlob(cobroFilename("pdf"), blob);
        setMsg("No pude abrir la hoja de compartir. Descargué el PDF para que lo envíes tú.");
      } catch (e2) {
        setMsg("No pude compartir el cobro.");
      }
    }
  }

  function marcarCobroPagado() {
    const jobs = statementJobs(data, cobroCliente, cobroDesde, cobroHasta);
    if (!jobs.length) return;
    if (!confirmCobro) {
      confirmCobro = true;
      render();
      return;
    }
    const ids = {};
    for (const j of jobs) ids[j.id] = true;
    const suma = jobs.reduce((sum, j) => sum + j.total, 0);
    data = Object.assign({}, data, {
      jobs: data.jobs.map((j) => (ids[j.id] ? Object.assign({}, j, { pagado: true }) : j)),
    });
    persist();
    confirmCobro = false;
    setMsg("Marqué como pagadas las " + jobs.length + (jobs.length === 1 ? " impresión" : " impresiones") + " de este cobro (" + fmtCLP(suma) + ").");
  }

  function render() {
    const root = document.getElementById("app");
    if (!root) return;
    const active = document.activeElement;
    const focusId = active && active.id;
    const start = active && typeof active.selectionStart === "number" ? active.selectionStart : null;
    const end = active && typeof active.selectionEnd === "number" ? active.selectionEnd : null;
    const mainEl = root.querySelector(".vs-main");
    const scrollTop = mainEl ? mainEl.scrollTop : 0;

    if (!ready) {
      root.innerHTML = '<div class="vs-app"><aside class="vs-sidebar"></aside><main class="vs-main"><p class="vs-muted">Cargando los datos de este dispositivo…</p></main></div>';
      return;
    }

    const navBtns = NAV.map((item) =>
      '<button type="button" class="' + (tab === item.id ? "vs-active" : "") + '" data-act="tab" data-tab="' + item.id + '">' + iconSvg(item.id) + " " + esc(item.label) + "</button>"
    ).join("");
    const tabBtns = NAV.map((item) =>
      '<button type="button" class="' + (tab === item.id ? "vs-active" : "") + '" data-act="tab" data-tab="' + item.id + '">' + iconSvg(item.id, 20) + "<span>" + esc(item.short) + "</span></button>"
    ).join("");

    let body = "";
    if (tab === "inicio") body = renderInicio();
    else if (tab === "nueva") body = renderNueva();
    else if (tab === "trabajos") body = renderTrabajos();
    else if (tab === "cobros") body = renderCobros();
    else if (tab === "inventario") body = renderInventario();
    else body = renderGanancia();

    root.innerHTML =
      '<div class="vs-app">' +
        '<aside class="vs-sidebar">' +
          '<div class="vs-brand"><span class="vs-mark">VS</span><span>VSolutions Control</span></div>' +
          '<nav class="vs-nav" aria-label="Navegación principal">' + navBtns + "</nav>" +
          '<div class="vs-side-foot"><span class="vs-avatar">VS</span><span><strong>Administrador</strong><small>Este dispositivo</small></span></div>' +
        "</aside>" +
        '<main class="vs-main">' +
          '<header class="vs-topbar"><div><p class="vs-eyebrow">' + esc(fmtLongDate()) + "</p><h1>" + esc(tabTitle(tab, form.editId)) + '</h1></div><div class="vs-chip"><span class="vs-dot"></span>Guardado en este dispositivo</div></header>' +
          alertsHtml() +
          body +
        "</main>" +
        '<nav class="vs-tabbar" aria-label="Navegación">' + tabBtns + "</nav>" +
      "</div>";

    const main2 = root.querySelector(".vs-main");
    if (main2) main2.scrollTop = scrollTop;
    if (focusId) {
      const el = document.getElementById(focusId);
      if (el && typeof el.focus === "function") {
        el.focus();
        if (start !== null && typeof el.setSelectionRange === "function") {
          try { el.setSelectionRange(start, end); } catch (e) {}
        }
      }
    }
  }

  function onMaterialChange(id) {
    form.materialId = id;
    const m = matById(data.materials, id);
    if (m) {
      form.precioStr = String(m.precioM2);
      form.totalLocked = false;
    }
    form.materialCliente = defaultsMaterialCliente(id);
    syncAutoTotal();
  }

  function fillForm(j) {
    form.editId = j.id;
    form.fecha = j.fecha;
    form.cliente = j.cliente;
    form.nuevoCliente = "";
    form.materialId = j.materialId;
    form.descripcion = j.descripcion;
    if (j.anchoCm && j.altoCm) {
      form.modo = "medidas";
      form.ancho = String(j.anchoCm).replace(".", ",");
      form.alto = String(j.altoCm).replace(".", ",");
      form.cantidad = String(j.cantidad || 1);
      form.m2Directo = "";
    } else {
      form.modo = "m2";
      form.m2Directo = String(j.m2).replace(".", ",");
      form.ancho = "";
      form.alto = "";
      form.cantidad = "1";
    }
    form.precioStr = String(j.precioM2);
    form.totalStr = String(j.total);
    form.totalLocked = true;
    form.materialCliente = j.materialCliente;
    tab = "nueva";
    msg = "";
    render();
  }

  function agregarCliente() {
    const name = form.nuevoCliente.trim();
    if (!name) { setMsg("Escribe el nombre del cliente."); return; }
    const existing = data.clients.find((c) => c.toLowerCase() === name.toLowerCase());
    if (existing) {
      form.cliente = existing;
      form.nuevoCliente = "";
      setMsg("Ese cliente ya estaba en la lista.");
      return;
    }
    form.cliente = name;
    form.nuevoCliente = "";
    data = Object.assign({}, data, { clients: data.clients.concat([name]) });
    persist();
    setMsg("Cliente agregado: " + name);
  }

  function guardar() {
    const cli = form.cliente.trim();
    if (!cli) { setMsg("Elige un cliente."); return; }
    const m2 = m2Calc();
    if (!Number.isFinite(m2) || m2 <= 0) { setMsg("Indica las medidas o los m²."); return; }
    const precioNum = parseCLP(form.precioStr);
    if (!Number.isFinite(precioNum) || precioNum < 0) { setMsg("Revisa el precio por m²."); return; }
    const total = parseCLP(form.totalStr);
    const auto = autoTotal();
    const finalTotal = Number.isFinite(total) ? Math.round(total) : Math.round(auto);
    if (!Number.isFinite(finalTotal)) { setMsg("Revisa el total."); return; }
    const prev = form.editId ? data.jobs.find((j) => j.id === form.editId) : undefined;
    let rolls = prev ? restore(data.rolls, prev.deducted) : data.rolls.slice();
    let deducted = [];
    let warnInv = false;
    if (!form.materialCliente) {
      const d = deduct(rolls, form.materialId, m2);
      rolls = d.rolls;
      deducted = d.deducted;
      if (!d.ok) warnInv = true;
    }
    const nextJob = {
      id: prev ? prev.id : nid("job"),
      fecha: form.fecha,
      cliente: cli,
      materialId: form.materialId,
      descripcion: form.descripcion.trim(),
      m2: m2,
      precioM2: precioNum,
      total: finalTotal,
      pagado: prev ? prev.pagado : false,
      materialCliente: form.materialCliente,
      anchoCm: form.modo === "medidas" ? parseM2(form.ancho) : null,
      altoCm: form.modo === "medidas" ? parseM2(form.alto) : null,
      cantidad: form.modo === "medidas" ? (Number.isFinite(parseM2(form.cantidad)) ? parseM2(form.cantidad) : 1) : 1,
      deducted: deducted,
    };
    const jobs = prev
      ? data.jobs.map((j) => (j.id === prev.id ? nextJob : j))
      : [nextJob].concat(data.jobs);
    data = Object.assign({}, data, { jobs, rolls });
    persist();
    resetForm();
    tab = "trabajos";
    filtroCliente = cli;
    msg = warnInv
      ? "Guardado sin descontar inventario: no hay un rollo de este material. Puedes agregarlo en Inventario."
      : (prev ? "Trabajo actualizado." : "Impresión guardada.");
    render();
  }

  function borrar(id) {
    if (confirmDel !== id) {
      confirmDel = id;
      render();
      return;
    }
    const prev = data.jobs.find((j) => j.id === id);
    const rolls = prev ? restore(data.rolls, prev.deducted) : data.rolls;
    data = Object.assign({}, data, { jobs: data.jobs.filter((j) => j.id !== id), rolls });
    persist();
    confirmDel = "";
    setMsg("Trabajo eliminado.");
  }

  function setPagado(id) {
    data = Object.assign({}, data, {
      jobs: data.jobs.map((j) => (j.id === id ? Object.assign({}, j, { pagado: !j.pagado }) : j)),
    });
    persist();
    render();
  }

  function marcarTodoPagado(cli) {
    if (confirmPay !== cli) {
      confirmPay = cli;
      render();
      return;
    }
    data = Object.assign({}, data, {
      jobs: data.jobs.map((j) => (j.cliente === cli && !j.pagado ? Object.assign({}, j, { pagado: true }) : j)),
    });
    persist();
    confirmPay = "";
    setMsg("Marqué como pagado todo lo de " + cli + ".");
  }

  function addMaterial() {
    const nombre = matNombre.trim();
    const precio = parseCLP(matPrecio);
    if (!nombre || !Number.isFinite(precio) || precio < 0) {
      setMsg("Indica el nombre y el precio de venta por m².");
      return;
    }
    if (data.materials.some((m) => m.nombre.toLowerCase() === nombre.toLowerCase())) {
      setMsg("Ese material ya existe.");
      return;
    }
    const costo = matCosto.trim() === "" ? null : parseCLP(matCosto);
    const m = {
      id: nid("mat"),
      nombre,
      precioM2: precio,
      costoM2: costo !== null && Number.isFinite(costo) ? costo : null,
    };
    data = Object.assign({}, data, { materials: data.materials.concat([m]) });
    persist();
    matNombre = "";
    matPrecio = "";
    matCosto = "";
    setMsg("Material agregado.");
  }

  function addRoll() {
    const nombre = rollNombre.trim();
    const mLin = parseM2(rollM2);
    if (!nombre || !Number.isFinite(mLin) || mLin < 0) {
      setMsg("Indica el nombre del rollo y los metros lineales disponibles.");
      return;
    }
    const parsedAncho = rollAncho.trim() === "" ? defaultAnchoM(rollMat) : parseM2(rollAncho);
    const anchoM = Number.isFinite(parsedAncho) && parsedAncho > 0 ? parsedAncho : defaultAnchoM(rollMat);
    const r = { id: nid("r"), materialId: rollMat, nombre, mLineales: mLin, anchoM, nota: "" };
    data = Object.assign({}, data, { rolls: data.rolls.concat([r]) });
    persist();
    rollNombre = "";
    rollM2 = "";
    rollAncho = "";
    setMsg("Rollo agregado.");
  }

  function onClick(e) {
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const act = t.getAttribute("data-act");
    if (act === "tab") {
      const next = t.getAttribute("data-tab");
      if (next === "nueva" && tab !== "nueva") resetForm();
      tab = next;
      if (next !== "trabajos") confirmDel = "";
      if (next !== "cobros") confirmCobro = false;
      render();
      return;
    }
    if (act === "nueva") {
      resetForm();
      tab = "nueva";
      render();
      return;
    }
    if (act === "export-json") {
      download("vsolutions-impresiones-" + todayISO() + ".json", JSON.stringify(data, null, 2), "application/json");
      setMsg("Descargué el respaldo JSON.");
      return;
    }
    if (act === "export-csv") {
      download("vsolutions-impresiones-" + todayISO() + ".csv", jobsCsv(data), "text/csv;charset=utf-8");
      setMsg("Descargué el CSV de trabajos.");
      return;
    }
    if (act === "import-json") {
      const input = document.getElementById("import-file");
      if (input) input.click();
      return;
    }
    if (act === "confirm-import") {
      if (!pendingImport) return;
      data = pendingImport;
      pendingImport = null;
      confirmImport = false;
      persist();
      resetForm();
      setMsg("Respaldo importado.");
      return;
    }
    if (act === "cancel-import") {
      confirmImport = false;
      pendingImport = null;
      msg = "";
      render();
      return;
    }
    if (act === "add-client") { agregarCliente(); return; }
    if (act === "cancel-edit") { resetForm(); render(); return; }
    if (act === "modo") {
      form.modo = t.getAttribute("data-modo");
      form.totalLocked = false;
      syncAutoTotal();
      render();
      return;
    }
    if (act === "guardar") { guardar(); return; }
    if (act === "toggle-pago") { setPagado(t.getAttribute("data-id")); return; }
    if (act === "editar") {
      const j = data.jobs.find((x) => x.id === t.getAttribute("data-id"));
      if (j) fillForm(j);
      return;
    }
    if (act === "borrar") { borrar(t.getAttribute("data-id")); return; }
    if (act === "pagar-todo") { marcarTodoPagado(t.getAttribute("data-cli")); return; }
    if (act === "filtro-estado") { filtroEstado = t.getAttribute("data-val"); render(); return; }
    if (act === "add-material") { addMaterial(); return; }
    if (act === "add-roll") { addRoll(); return; }
    if (act === "cobro-pdf") { descargarCobroPdf(); return; }
    if (act === "cobro-png") { descargarCobroPng(); return; }
    if (act === "cobro-share") { compartirCobro(); return; }
    if (act === "cobro-pagar") { marcarCobroPagado(); return; }
  }

  function onInput(e) {
    const el = e.target;
    if (el.dataset.field) {
      const key = el.dataset.field;
      if (key === "filtroCliente") {
        filtroCliente = el.value;
        render();
        return;
      }
      if (key === "cobroCliente" || key === "cobroDesde" || key === "cobroHasta") {
        if (key === "cobroCliente") cobroCliente = el.value;
        if (key === "cobroDesde") cobroDesde = el.value;
        if (key === "cobroHasta") cobroHasta = el.value;
        confirmCobro = false;
        render();
        return;
      }
      if (key === "materialId") {
        onMaterialChange(el.value);
        render();
        return;
      }
      if (key === "materialCliente") {
        form.materialCliente = el.checked;
        return;
      }
      form[key] = el.type === "checkbox" ? el.checked : el.value;
      if (el.dataset.lock) form.totalLocked = true;
      else if (key === "ancho" || key === "alto" || key === "cantidad" || key === "m2Directo" || key === "precioStr") {
        form.totalLocked = false;
        syncAutoTotal();
        const totalEl = document.getElementById("f-total");
        const calc = document.querySelector(".vs-calc");
        if (calc) {
          const m2 = m2Calc();
          const precioNum = parseCLP(form.precioStr);
          const auto = autoTotal();
          const totalShown = form.totalStr ? fmtCLP(parseCLP(form.totalStr) || 0) : (Number.isFinite(auto) ? fmtCLP(auto) : "—");
          const strongs = calc.querySelectorAll("strong");
          if (strongs[0]) strongs[0].textContent = Number.isFinite(m2) ? fmtM2(m2) : "—";
          if (strongs[1]) strongs[1].textContent = Number.isFinite(precioNum) ? fmtCLP(precioNum) : "—";
          if (strongs[2]) strongs[2].textContent = totalShown;
        }
        if (totalEl && !form.totalLocked) totalEl.value = form.totalStr;
      }
      return;
    }
    if (el.dataset.aux) {
      const k = el.dataset.aux;
      if (k === "matNombre") matNombre = el.value;
      else if (k === "matPrecio") matPrecio = el.value;
      else if (k === "matCosto") matCosto = el.value;
      else if (k === "rollNombre") rollNombre = el.value;
      else if (k === "rollMat") { rollMat = el.value; render(); }
      else if (k === "rollM2") rollM2 = el.value;
      else if (k === "rollAncho") rollAncho = el.value;
      else if (k === "datosPago") {
        saveDatosPago(el.value);
        updatePagoPreview();
      }
      return;
    }
    if (el.dataset.matPrecio) {
      const id = el.dataset.matPrecio;
      drafts[id + "-p"] = el.value;
      const n = parseCLP(el.value);
      if (Number.isFinite(n) && n >= 0) {
        data = Object.assign({}, data, { materials: data.materials.map((m) => m.id === id ? Object.assign({}, m, { precioM2: n }) : m) });
        persist();
      }
      return;
    }
    if (el.dataset.matCosto) {
      const id = el.dataset.matCosto;
      drafts[id + "-c"] = el.value;
      if (el.value.trim() === "") {
        data = Object.assign({}, data, { materials: data.materials.map((m) => m.id === id ? Object.assign({}, m, { costoM2: null }) : m) });
        persist();
      } else {
        const n = parseCLP(el.value);
        if (Number.isFinite(n) && n >= 0) {
          data = Object.assign({}, data, { materials: data.materials.map((m) => m.id === id ? Object.assign({}, m, { costoM2: n }) : m) });
          persist();
        }
      }
      return;
    }
    if (el.dataset.rollM) {
      const id = el.dataset.rollM;
      drafts[id + "-m"] = el.value;
      const n = parseM2(el.value);
      if (Number.isFinite(n)) {
        data = Object.assign({}, data, { rolls: data.rolls.map((r) => r.id === id ? Object.assign({}, r, { mLineales: n }) : r) });
        persist();
      }
      return;
    }
    if (el.dataset.rollW) {
      const id = el.dataset.rollW;
      drafts[id + "-w"] = el.value;
      const n = parseM2(el.value);
      if (Number.isFinite(n) && n > 0) {
        data = Object.assign({}, data, { rolls: data.rolls.map((r) => r.id === id ? Object.assign({}, r, { anchoM: n }) : r) });
        persist();
      }
      return;
    }
  }

  function onChange(e) {
    const el = e.target;
    if (el.dataset.field === "cliente" || el.dataset.field === "fecha" || el.dataset.field === "filtroCliente" || el.dataset.field === "materialId" || el.dataset.field === "cobroCliente" || el.dataset.field === "cobroDesde" || el.dataset.field === "cobroHasta" || el.dataset.aux === "rollMat") {
      onInput(e);
    }
    if (el.dataset.field === "materialCliente") {
      form.materialCliente = el.checked;
    }
  }

  function onPickFile(e) {
    const files = e.target.files;
    const f = files && files[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const parsed = normalize(JSON.parse(String(reader.result)));
        if (!parsed) {
          setMsg("El archivo no es un respaldo válido.");
          return;
        }
        pendingImport = parsed;
        confirmImport = true;
        setMsg("Esto reemplaza todos los datos de este dispositivo. Confirma si quieres importar.");
      } catch (err) {
        setMsg("No pude leer el JSON.");
      }
    };
    reader.readAsText(f);
  }

  function load() {
    try {
      const s = store();
      if (!s) {
        persistOk = false;
        data = seed();
      } else {
        const raw = s.getItem(KEY);
        if (raw) {
          const parsed = normalize(JSON.parse(raw));
          data = parsed || seed();
        } else {
          data = seed();
          s.setItem(KEY, JSON.stringify(data));
        }
        persistOk = true;
      }
    } catch (e) {
      persistOk = false;
      data = seed();
    }
    ready = true;
    loadDatosPago();
    resetForm();
    render();
  }

  function bind() {
    if (bound) return;
    bound = true;
    const root = document.getElementById("app");
    root.addEventListener("click", onClick);
    root.addEventListener("input", onInput);
    root.addEventListener("change", onChange);
    const file = document.getElementById("import-file");
    if (file) file.addEventListener("change", onPickFile);
  }

  bind();
  load();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function () {});
    });
  }

  window.VSOL_TEST = {
    buildStatementPdf: buildStatementPdf,
    cobroFileBase: cobroFileBase,
    statementJobs: statementJobs,
    getData: function () { return data; },
    setData: setData,
    setPago: function (t) { saveDatosPago(t); },
    goTab: function (id) { tab = id; render(); },
  };
}
