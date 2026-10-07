/**
 * Harmony Product Strategic Planning & SWOT Workspace Service
 * Manages development roadmaps, strengths, weaknesses, opportunities, and threats
 * Strictly decoupled from the scientific NASA SWOT (Surface Water and Ocean Topography) satellite.
 */

export type SWOTQuadrant = 'strengths' | 'weaknesses' | 'opportunities' | 'threats';
export type SWOTPriority = 'tinggi' | 'sedang' | 'rendah';
export type EvidenceStatus = 'verified' | 'draft' | 'unverified';
export type ActionStatus = 'rencana' | 'dalam_progres' | 'selesai' | 'ditunda';

export interface SWOTItem {
  id: string;
  quadrant: SWOTQuadrant;
  title: string;
  description: string;
  evidenceLinks: string[];
  evidenceStatus: EvidenceStatus;
  priority: SWOTPriority;
  owner?: string;
  plannedAction: string;
  targetDate?: string;
  status: ActionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SWOTWorkspace {
  id: string;
  title: string;
  version: string;
  lastUpdated: string;
  items: SWOTItem[];
}

const STORAGE_KEY = 'harmony_product_swot_workspace';

export const INITIAL_SWOT_WORKSPACE: SWOTWorkspace = {
  id: 'harmony-core-plan-2026',
  title: 'Rencana Strategis & Matriks SWOT Produk Harmony',
  version: '2.1.0',
  lastUpdated: new Date().toISOString(),
  items: [
    {
      id: 'swot-s-1',
      quadrant: 'strengths',
      title: 'Rancangan Arsitektur Geospasial Multi-Sensor',
      description: 'Perancangan pipeline Sentinel-1 SAR, Sentinel-2 MSI, Landsat termal LST, dan radar BMKG dengan kepatuhan zero-fabrication.',
      evidenceLinks: ['tests/spatialCore.test.mjs', 'docs/SUMBER_DATA.md'],
      evidenceStatus: 'draft',
      priority: 'tinggi',
      owner: 'Tim Geospasial',
      plannedAction: 'Pertahankan protokol zero-fabrication dan selesaikan integrasi raster nyata.',
      targetDate: '2026-11-30',
      status: 'dalam_progres',
      createdAt: '2026-10-01T08:00:00Z',
      updatedAt: '2026-10-02T10:00:00Z',
    },
    {
      id: 'swot-s-2',
      quadrant: 'strengths',
      title: 'Eksplorasi Skenario Berbasis Data Sekolah',
      description: 'Platform merintis pemanfaatan koordinat sekolah Dapodik untuk pemetaan jarak aksesibilitas 15 menit (Efektivitas kurikulum kelas masih tahap rancangan).',
      evidenceLinks: ['apps/web/src/data/schools.ts'],
      evidenceStatus: 'unverified',
      priority: 'sedang',
      owner: 'Tim Edukasi',
      plannedAction: 'Lakukan uji coba lapangan di sekolah percontohan sebelum mengklaim dampak pembelajaran.',
      targetDate: '2026-12-15',
      status: 'rencana',
      createdAt: '2026-10-01T08:00:00Z',
      updatedAt: '2026-10-02T10:00:00Z',
    },
    {
      id: 'swot-w-1',
      quadrant: 'weaknesses',
      title: 'Ketergantungan Kuota Free Tier STAC & Routing Publik',
      description: 'Layanan publik seperti OSRM public demo dan AWS Earth Search memiliki rate-limit pada request serentak skala besar.',
      evidenceLinks: ['apps/web/src/services/routingService.ts'],
      evidenceStatus: 'draft',
      priority: 'tinggi',
      owner: 'Tim DevOps',
      plannedAction: 'Sediakan instans worker mandiri lokal dan cache persisten Postgres/PostGIS untuk rute populer.',
      targetDate: '2026-11-15',
      status: 'rencana',
      createdAt: '2026-10-01T08:00:00Z',
      updatedAt: '2026-10-02T10:00:00Z',
    },
    {
      id: 'swot-o-1',
      quadrant: 'opportunities',
      title: 'Adopsi Standar Satu Data Bencana Nasional',
      description: 'Peluang kolaborasi integrasi data resmi BNPB InaRISK, KLHK SiPongi, dan Kemendikbudristek untuk pemetaan resiliensi sekolah se-Indonesia.',
      evidenceLinks: ['https://sipongi.menlhk.go.id', 'https://inarisk.bnpb.go.id'],
      evidenceStatus: 'draft',
      priority: 'sedang',
      owner: 'Tim Kemitraan',
      plannedAction: 'Bangun adapter open-standard OGC WMS/WFS untuk memudahkan konsumsi oleh instansi pemerintah.',
      targetDate: '2027-02-28',
      status: 'rencana',
      createdAt: '2026-10-01T08:00:00Z',
      updatedAt: '2026-10-02T10:00:00Z',
    },
    {
      id: 'swot-t-1',
      quadrant: 'threats',
      title: 'Dinamika Akses API Eksternal & Perubahan Format Endpoint',
      description: 'Penyedia data global dan nasional dapat mengubah skema respons atau memperketat autentikasi API tanpa pemberitahuan sebelumnya.',
      evidenceLinks: ['apps/server/src/routes/bmkgRoutes.js'],
      evidenceStatus: 'draft',
      priority: 'tinggi',
      owner: 'Tim Backend',
      plannedAction: 'Gunakan schema validator dan fallback cache dengan status freshness yang jelas.',
      targetDate: '2026-10-31',
      status: 'dalam_progres',
      createdAt: '2026-10-01T08:00:00Z',
      updatedAt: '2026-10-02T10:00:00Z',
    },
  ],
};

export class ProductSWOTService {
  private workspace: SWOTWorkspace;
  private currentOwnerId: string = 'default';

  constructor(ownerId: string = 'default') {
    this.currentOwnerId = ownerId;
    this.workspace = this.loadFromStorage(ownerId);
  }

  private getStorageKey(ownerId: string): string {
    return `harmony_swot_${ownerId || 'default'}`;
  }

  public setOwner(ownerId: string): void {
    this.currentOwnerId = ownerId || 'default';
    this.workspace = this.loadFromStorage(this.currentOwnerId);
  }

  public getOwner(): string {
    return this.currentOwnerId;
  }

  private loadFromStorage(ownerId: string): SWOTWorkspace {
    try {
      const stored = localStorage.getItem(this.getStorageKey(ownerId));
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    // Deep clone INITIAL_SWOT_WORKSPACE so modifying one workspace does not mutate the template
    return JSON.parse(JSON.stringify(INITIAL_SWOT_WORKSPACE));
  }

  public getWorkspace(): SWOTWorkspace {
    return this.workspace;
  }

  public saveWorkspace(ws: SWOTWorkspace): void {
    this.workspace = {
      ...ws,
      lastUpdated: new Date().toISOString(),
    };
    try {
      localStorage.setItem(this.getStorageKey(this.currentOwnerId), JSON.stringify(this.workspace));
    } catch {}
  }

  public addItem(item: Omit<SWOTItem, 'id' | 'createdAt' | 'updatedAt'>): SWOTItem {
    const newItem: SWOTItem = {
      ...item,
      id: `swot-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.workspace.items.push(newItem);
    this.saveWorkspace(this.workspace);
    return newItem;
  }

  public updateItem(id: string, updates: Partial<Omit<SWOTItem, 'id' | 'createdAt'>>): SWOTItem | null {
    const idx = this.workspace.items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    this.workspace.items[idx] = {
      ...this.workspace.items[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveWorkspace(this.workspace);
    return this.workspace.items[idx];
  }

  public deleteItem(id: string): boolean {
    const initialLen = this.workspace.items.length;
    this.workspace.items = this.workspace.items.filter((i) => i.id !== id);
    if (this.workspace.items.length !== initialLen) {
      this.saveWorkspace(this.workspace);
      return true;
    }
    return false;
  }

  /**
   * Export workspace to formatted Markdown
   */
  public exportToMarkdown(): string {
    const ws = this.workspace;
    let md = `# ${ws.title}\n\n`;
    md += `*Versi:* ${ws.version} | *Terakhir Diperbarui:* ${new Date(ws.lastUpdated).toLocaleDateString('id-ID', { dateStyle: 'long' })}\n\n`;
    md += `> Dokumen perencanaan strategis ini memuat analisis internal (Kekuatan & Kelemahan) dan eksternal (Peluang & Ancaman) platform Harmony.\n\n`;

    const quadrants: { q: SWOTQuadrant; title: string }[] = [
      { q: 'strengths', title: '1. Kekuatan (Strengths) — Faktor Internal Positif' },
      { q: 'weaknesses', title: '2. Kelemahan (Weaknesses) — Faktor Internal Kritis' },
      { q: 'opportunities', title: '3. Peluang (Opportunities) — Faktor Eksternal Menguntungkan' },
      { q: 'threats', title: '4. Ancaman (Threats) — Faktor Eksternal Risiko' },
    ];

    quadrants.forEach(({ q, title }) => {
      md += `## ${title}\n\n`;
      const qItems = ws.items.filter((i) => i.quadrant === q);
      if (qItems.length === 0) {
        md += `*(Belum ada poin yang dicatat pada kuadran ini)*\n\n`;
      } else {
        qItems.forEach((item, idx) => {
          md += `### ${idx + 1}. ${item.title}\n`;
          md += `- **Deskripsi:** ${item.description}\n`;
          md += `- **Prioritas:** ${item.priority.toUpperCase()} | **Status:** ${item.status}\n`;
          md += `- **Rencana Tindak Lanjut:** ${item.plannedAction}\n`;
          if (item.targetDate) md += `- **Target Penyelesaian:** ${item.targetDate}\n`;
          if (item.evidenceLinks.length > 0) {
            md += `- **Bukti / Evidence (${item.evidenceStatus}):** ${item.evidenceLinks.join(', ')}\n`;
          }
          md += `\n`;
        });
      }
    });

    return md;
  }

  public exportMarkdown(): string {
    return this.exportToMarkdown();
  }

  public exportJSON(): string {
    return JSON.stringify(this.workspace, null, 2);
  }
}

export const productSwotService = new ProductSWOTService();
