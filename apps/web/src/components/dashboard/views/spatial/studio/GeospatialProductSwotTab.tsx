import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Download,
  ShieldAlert,
  Target,
  Sparkles,
  Link as LinkIcon,
  Tag,
  Calendar,
  User,
  Info,
} from 'lucide-react';
import {
  productSwotService,
  SWOTItem,
  SWOTQuadrant,
  SWOTWorkspace,
} from '../../../../../services/geospatial/productSwotService';

export const GeospatialProductSwotTab: React.FC = () => {
  const [workspace, setWorkspace] = useState<SWOTWorkspace>(productSwotService.getWorkspace());
  const [selectedQuadrant, setSelectedQuadrant] = useState<SWOTQuadrant>('strengths');

  // New Item form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAction, setNewAction] = useState('');
  const [newEvidence, setNewEvidence] = useState('');
  const [newPriority, setNewPriority] = useState<SWOTItem['priority']>('sedang');
  const [newOwner, setNewOwner] = useState('Tim Geospasial');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const added = productSwotService.addItem({
      quadrant: selectedQuadrant,
      title: newTitle.trim(),
      description: newDesc.trim(),
      plannedAction: newAction.trim(),
      evidenceLinks: newEvidence.trim() ? newEvidence.split(',').map((s) => s.trim()) : [],
      evidenceStatus: 'draft',
      priority: newPriority,
      owner: newOwner,
      status: 'rencana',
    });

    setWorkspace(productSwotService.getWorkspace());
    setNewTitle('');
    setNewDesc('');
    setNewAction('');
    setNewEvidence('');
    setShowAddForm(false);
  };

  const handleDeleteItem = (id: string) => {
    productSwotService.deleteItem(id);
    setWorkspace(productSwotService.getWorkspace());
  };

  const handleExportMarkdown = () => {
    const md = productSwotService.exportMarkdown();
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harmony_product_swot_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const jsonStr = productSwotService.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harmony_product_swot_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentItems = workspace.items.filter((i) => i.quadrant === selectedQuadrant);

  const quadrantMeta = {
    strengths: {
      label: 'Kekuatan (Strengths)',
      desc: 'Faktor keunggulan internal: arsitektur, kepatuhan sains tanpa fabrikasi, modul teruji.',
      color: 'text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25',
    },
    weaknesses: {
      label: 'Kelemahan (Weaknesses)',
      desc: 'Tantangan internal: kuota free-tier API publik, ketergantungan koneksi pihak ketiga.',
      color: 'text-rose-600 dark:text-rose-400',
      badge: 'bg-rose-500/15 text-rose-600 border-rose-500/25',
    },
    opportunities: {
      label: 'Peluang (Opportunities)',
      desc: 'Peluang eksternal: Satu Data Bencana, adopsi sekolah nasional, integrasi InaRISK & SiPongi.',
      color: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-500/15 text-blue-600 border-blue-500/25',
    },
    threats: {
      label: 'Ancaman (Threats)',
      desc: 'Faktor eksternal: perubahan skema/kebijakan API upstream, latensi jaringan internet.',
      color: 'text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-500/15 text-amber-600 border-amber-500/25',
    },
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-sky-500/10 border border-purple-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-purple-500/25">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Rencana Pengembangan & Analisis SWOT Produk Harmony
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25">
                Strategic Workspace
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Workspace terstruktur perencanaan strategis, peta jalan fitur, dan keterkaitan bukti audit (evidence)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportMarkdown}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Markdown
          </button>
          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> JSON
          </button>
        </div>
      </div>

      {/* Disambiguation Disclaimer */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
        <div>
          <strong>Klarifikasi Penamaan SWOT:</strong> Modul ini adalah instrumen manajemen strategis produk Harmony (Strengths, Weaknesses, Opportunities, Threats) dan sepenuhnya terpisah dari satelit oseanografi <em>NASA/CNES SWOT (Surface Water and Ocean Topography)</em> yang berada di katalog ilmiah observasi bumi.
        </div>
      </div>

      {/* Quadrant Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {(['strengths', 'weaknesses', 'opportunities', 'threats'] as SWOTQuadrant[]).map((q) => {
          const count = workspace.items.filter((i) => i.quadrant === q).length;
          const isSelected = selectedQuadrant === q;
          return (
            <button
              key={q}
              onClick={() => setSelectedQuadrant(q)}
              className={`p-3 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'bg-slate-900 text-white dark:bg-indigo-950/80 dark:border-indigo-500 shadow-md ring-2 ring-indigo-500/30'
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold capitalize">{q}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  {count}
                </span>
              </div>
              <p className="text-[10px] opacity-75 truncate">{quadrantMeta[q].label.split(' ')[0]}</p>
            </button>
          );
        })}
      </div>

      {/* Quadrant Detail & Add Item Form */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <h4 className={`text-base font-bold flex items-center gap-2 ${quadrantMeta[selectedQuadrant].color}`}>
              {quadrantMeta[selectedQuadrant].label}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {quadrantMeta[selectedQuadrant].desc}
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Poin
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <form onSubmit={handleAddItem} className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Judul Poin Analisis
              </label>
              <input name="newTitle" id="geospatialproductswottab-newtitle"
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Misal: Peningkatan Kecepatan Rendering Raster"
                className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Deskripsi Objektif
              </label>
              <textarea name="newDesc" id="geospatialproductswottab-newdesc"
                rows={2}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Penjelasan latar belakang dan urgensi teknis..."
                className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Rencana Tindak Lanjut
                </label>
                <input name="newAction" id="geospatialproductswottab-newaction"
                  type="text"
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  placeholder="Langkah aksi nyata..."
                  className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Prioritas
                </label>
                <select name="newPriority" id="geospatialproductswottab-newpriority"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                >
                  <option value="tinggi">Tinggi</option>
                  <option value="sedang">Sedang</option>
                  <option value="rendah">Rendah</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tautan Bukti / Evidence (pisahkan koma)
                </label>
                <input name="newEvidence" id="geospatialproductswottab-newevidence"
                  type="text"
                  value={newEvidence}
                  onChange={(e) => setNewEvidence(e.target.value)}
                  placeholder="tests/spatialCore.test.mjs, docs/..."
                  className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
              >
                Simpan Item
              </button>
            </div>
          </form>
        )}

        {/* Items List */}
        <div className="space-y-3">
          {currentItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Belum ada poin terdaftar pada kuadran ini. Klik "+ Tambah Poin" untuk memulai.
            </div>
          ) : (
            currentItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </h5>
                      <span
                        className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          item.priority === 'tinggi'
                            ? 'bg-rose-500/15 text-rose-600 border border-rose-500/25'
                            : item.priority === 'sedang'
                            ? 'bg-amber-500/15 text-amber-600 border border-amber-500/25'
                            : 'bg-slate-500/15 text-slate-600 border border-slate-500/25'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {item.plannedAction && (
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                    <strong className="text-purple-600 dark:text-purple-400">Tindak Lanjut: </strong>
                    {item.plannedAction}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {item.owner || 'Tim Harmony'}
                    </span>
                    {item.evidenceLinks.length > 0 && (
                      <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-mono">
                        <LinkIcon className="w-3 h-3" /> {item.evidenceLinks.join(', ')}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px]">{new Date(item.updatedAt).toLocaleDateString('id-ID')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
