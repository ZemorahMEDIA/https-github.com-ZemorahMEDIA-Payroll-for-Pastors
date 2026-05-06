/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import { 
  Download, 
  Info,
  DollarSign, 
  Calendar,
  ShieldCheck,
  TrendingDown,
  User,
  MapPin,
  Building2,
  Phone,
  Loader2,
  History,
  Save,
  FolderOpen,
  Trash2,
  Plus,
  RefreshCcw,
  Mail,
  FileText,
  MessageCircle,
  Smartphone,
  X,
  Send,
  Share2
} from 'lucide-react';
import { TaxConfig, TaxResult, PAY_PERIODS, MONTHS, YEARS, PayslipRecord, ClientProfile } from './types';
import { calculateTax } from './utils/taxCalc';

const EMPLOYER_INFO = {
  name: "Mission Chrétienne Fontaine de Vie",
  address: "1789 Sainte-Hélène, Longueuil, QC, J4K3T2",
  phone: "514-904-4043"
};

const INITIAL_CONFIG: TaxConfig = {
  grossIncome: 2500,
  housingFMV: 1500,
  utilities: 300,
  payFrequency: 'monthly',
  employeeName: '',
  employeeSIN: '',
  employeeAddress: '',
  payrollYear: 2025,
  payrollMonth: 'Mai',
  hasClergyDeduction: true
};

function EmployerStat({ label, value, color, isTotal = false }: { label: string, value: string, color: string, isTotal?: boolean }) {
  return (
    <div className={`p-4 rounded-lg ${isTotal ? 'bg-black text-white shadow-lg' : 'bg-white border border-slate-200'}`}>
      <p className={`text-[10px] ${isTotal ? 'text-white/70' : 'text-blue-900/70'} font-bold uppercase mb-1`}>{label}</p>
      <p className={`text-lg font-black ${isTotal ? 'text-white' : color}`}>{value}</p>
    </div>
  );
}

export default function App() {
  const [exporting, setExporting] = useState(false);
  const payslipRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [config, setConfig] = useState<TaxConfig>(INITIAL_CONFIG);
  const [history, setHistory] = useState<PayslipRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'input' | 'history'>('input');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const results = useMemo(() => calculateTax(config), [config]);

  const handleInputChange = (field: keyof TaxConfig, value: string | number | boolean) => {
    setConfig(prev => ({
      ...prev,
      [field]: typeof value === 'string' && (field === 'grossIncome' || field === 'housingFMV' || field === 'utilities') 
        ? (isNaN(parseFloat(value)) ? 0 : parseFloat(value)) 
        : value
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleSaveToHistory = () => {
    const record: PayslipRecord = {
      id: crypto.randomUUID(),
      dateCreated: new Date().toISOString(),
      config: { ...config },
      results: { ...results }
    };
    setHistory(prev => [record, ...prev]);
    setShowSaveConfirm(true);
  };

  const handleLoadHistory = (record: PayslipRecord) => {
    setConfig(record.config);
    setActiveTab('input');
  };

  const handleDeleteHistory = (id: string) => {
    setHistory(prev => prev.filter(r => r.id !== id));
  };

  const handleExportProfile = () => {
    const profile: ClientProfile = {
      employeeName: config.employeeName,
      employeeSIN: config.employeeSIN,
      employeeAddress: config.employeeAddress,
      history: history
    };
    
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Profil_${config.employeeName.replace(/\s+/g, '_') || 'Client'}.clergy`;
    link.click();
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    setConfig(INITIAL_CONFIG);
    setHistory([]);
    setActiveTab('input');
    setShowResetConfirm(false);
  };

  const handleImportProfile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const profile = JSON.parse(event.target?.result as string) as ClientProfile;
        if (profile.history) {
          setHistory(profile.history);
          setConfig({
            ...INITIAL_CONFIG,
            employeeName: profile.employeeName || '',
            employeeSIN: profile.employeeSIN || '',
            employeeAddress: profile.employeeAddress || '',
          });
          setActiveTab('history');
        }
      } catch (error) {
        alert('Invalid file format. Please upload a .clergy file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportPDF = async () => {
    if (!payslipRef.current) return;
    
    setExporting(true);
    try {
      const element = payslipRef.current;
      const originalStyle = element.getAttribute('style') || '';
      
      // Force desktop layout for capture regardless of current viewport
      const totalWidth = 1024; // Use 1024 for even more space during capture
      element.style.width = `${totalWidth}px`;
      element.style.minWidth = `${totalWidth}px`;
      element.style.maxWidth = `${totalWidth}px`;
      
      // We need to wait a tiny bit for the layout to recalculate
      await new Promise(resolve => setTimeout(resolve, 100));

      const captureHeight = element.scrollHeight;

      const dataUrl = await htmlToImage.toPng(element, {
        quality: 1.0,
        pixelRatio: 2, 
        backgroundColor: '#ffffff',
        width: totalWidth,
        height: captureHeight,
        style: {
          transform: 'none',
          width: `${totalWidth}px`,
          height: `${captureHeight}px`,
          overflow: 'hidden',
          margin: '0',
          padding: '0',
          // Force desktop font sizes during capture
          fontSize: '16px', 
        },
        filter: (node) => {
          const exclusionClasses = ['print:hidden'];
          if (node instanceof HTMLElement) {
            node.style.overflow = 'hidden';
            node.style.scrollbarWidth = 'none';
            // Explicitly hide any scrollbars that might be triggered by padding
            if (node.classList.contains('overflow-x-auto')) {
              node.style.overflowX = 'hidden';
            }
            return !exclusionClasses.some(cls => node.classList.contains(cls));
          }
          return true;
        }
      });
      
      element.setAttribute('style', originalStyle);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Get image properties to maintain aspect ratio
      const img = new Image();
      img.src = dataUrl;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      const imgWidth = img.width;
      const imgHeight = img.height;
      const ratio = imgWidth / imgHeight;
      
      const margin = 10; // 10mm margin for printing zone
      let finalWidth = pageWidth - (margin * 2); 
      let finalHeight = finalWidth / ratio;
      
      // If content is too long for one page, we scale it to fit height if it exceeds page
      if (finalHeight > pageHeight - (margin * 2)) {
        finalHeight = pageHeight - (margin * 2);
        finalWidth = finalHeight * ratio;
      }
      
      const xOffset = (pageWidth - finalWidth) / 2;
      const yOffset = (pageHeight - finalHeight) / 2; // Perfectly centered vertically and horizontally
      
      pdf.addImage(dataUrl, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
      
      const safeName = (config.employeeName || 'Employe').replace(/[^a-z0-9]/gi, '_');
      const fileName = `Bulletin_${safeName}_${config.payrollMonth}_${config.payrollYear}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Erreur: La génération du PDF a échoué. Utilisez la fonction Imprimer (Ctrl+P) comme alternative.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-black selection:bg-black selection:text-white">
      {/* Save Confirmation Modal */}
      <AnimatePresence>
        {showSaveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[320px] overflow-hidden p-6 text-center"
            >
              <div className="w-12 h-12 bg-slate-100 text-black rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-slate-100">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-black mb-2 uppercase tracking-tight">Record Sauvegardé</h3>
              <p className="text-[11px] text-blue-900/60 mb-6 font-medium leading-relaxed italic">
                Le bulletin de paie pour <span className="text-black font-bold">{config.employeeName || "l'employé"}</span> a été ajouté à l'historique.
              </p>
              <button 
                onClick={() => setShowSaveConfirm(false)}
                className="w-full bg-black text-white text-xs font-bold py-2.5 rounded-lg hover:bg-white hover:text-black border border-transparent hover:border-black transition-all shadow-lg active:scale-95"
              >
                COMPRIS
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImportProfile} 
        accept=".clergy" 
        className="hidden" 
      />

      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 px-3 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center sticky top-0 z-20 print:hidden gap-3 text-black">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white font-bold shrink-0">M</div>
          <span className="text-base md:text-xl font-bold tracking-tight uppercase truncate text-black">
            Mission Chrétienne<span className="text-black ml-1">Fontaine de Vie</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-1.5 w-full md:w-auto">
          {showResetConfirm ? (
            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-black animate-pulse">
              <span className="text-[10px] font-bold text-black px-2 uppercase">Réinitialiser ?</span>
              <button 
                onClick={handleReset}
                className="bg-black text-white px-3 py-1.5 text-xs font-bold rounded-md hover:bg-white hover:text-black border border-transparent hover:border-black transition-colors"
              >
                Oui, tout effacer
              </button>
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="bg-slate-200 text-black px-3 py-1.5 text-xs font-bold rounded-md hover:bg-black hover:text-white transition-colors"
              >
                Non
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center justify-center border border-slate-200 text-black p-2 text-sm font-bold rounded-lg hover:bg-black hover:text-white transition-colors"
              title="Tout réinitialiser"
            >
              <RefreshCcw size={16} />
            </button>
          )}
          <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 border border-slate-200 text-black px-3 py-2 text-[11px] md:text-sm font-bold rounded-lg hover:bg-black hover:text-white transition-colors"
          >
            <FolderOpen size={14} className="md:w-4 md:h-4" /> <span className="hidden xs:inline">Ouvrir Profil</span><span className="xs:hidden">Ouvrir</span>
          </button>
          <button 
            onClick={handleExportProfile}
            className="flex items-center gap-1.5 border border-slate-200 text-black px-3 py-2 text-[11px] md:text-sm font-bold rounded-lg hover:bg-black hover:text-white transition-colors"
          >
            <Save size={14} className="md:w-4 md:h-4" /> <span className="hidden xs:inline">Sauver Profil</span><span className="xs:hidden">Sauver</span>
          </button>
          <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1" />
          <button 
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-black text-white px-3 py-2 text-[11px] md:text-sm font-bold rounded-lg hover:bg-white hover:text-black border border-transparent hover:border-black transition-colors shadow-sm disabled:opacity-50 min-w-[100px] md:min-w-[140px] justify-center"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} className="md:w-4 md:h-4" />}
            {exporting ? '...' : 'Exporter PDF'}
          </button>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 md:p-8">
        <aside className="lg:col-span-4 flex flex-col space-y-6 print:hidden">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('input')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'input' 
                  ? 'bg-black text-white shadow-sm hover:bg-white hover:text-black border border-transparent hover:border-black' 
                  : 'bg-white text-black border border-slate-200 hover:bg-black hover:text-white'
              }`}
            >
              <Plus size={14} /> Entry
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'history' 
                  ? 'bg-black text-white shadow-sm hover:bg-white hover:text-black border border-transparent hover:border-black' 
                  : 'bg-white text-black border border-slate-200 hover:bg-black hover:text-white'
              }`}
            >
              <History size={14} /> Hist. ({history.length})
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'input' ? (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <section className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col space-y-6 shadow-sm">
                  <div>
                    <h2 className="text-lg font-bold mb-1 text-black">Configuration de la Paie</h2>
                    <p className="text-xs text-blue-900/70 uppercase tracking-wider font-semibold">Employé & Période</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-black">Nom Complet</label>
                      <input 
                        type="text"
                        value={config.employeeName}
                        onChange={(e) => handleInputChange('employeeName', e.target.value)}
                        placeholder="Jean Dupont"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-black text-black"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black">NAS (Assurance Sociale)</label>
                        <input 
                          type="text"
                          value={config.employeeSIN}
                          onChange={(e) => handleInputChange('employeeSIN', e.target.value)}
                          placeholder="000-000-000"
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-black text-black"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black">Période</label>
                        <div className="flex gap-2">
                          <select 
                            value={config.payrollMonth}
                            onChange={(e) => handleInputChange('payrollMonth', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg text-xs p-2 outline-none focus:border-black text-black"
                          >
                            {MONTHS.map(m => <option key={m} value={m}>{m.slice(0,3)}</option>)}
                          </select>
                          <select 
                            value={config.payrollYear}
                            onChange={(e) => handleInputChange('payrollYear', parseInt(e.target.value))}
                            className="bg-white border border-slate-200 rounded-lg text-xs p-2 outline-none focus:border-black text-black"
                          >
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-black">Adresse Résidentielle</label>
                      <input 
                        type="text"
                        value={config.employeeAddress}
                        onChange={(e) => handleInputChange('employeeAddress', e.target.value)}
                        placeholder="Rue, Ville, Code Postal"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-black text-black"
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                      <h2 className="text-sm font-bold mb-4 italic text-black">Paramètres Financiers</h2>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-black">Salaire Brut / Allocation</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-blue-900/40 font-mono text-sm">$</span>
                            <input 
                              type="number"
                              value={config.grossIncome}
                              onChange={(e) => handleInputChange('grossIncome', e.target.value)}
                              className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-black outline-none transition-all text-black"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-black">Fréquence de Paie</label>
                          <div className="grid grid-cols-2 gap-2">
                            {(['monthly', 'semi-monthly', 'bi-weekly', 'weekly', 'annually'] as const).map((freq) => {
                               const labels:Record<string, string> = {
                                'monthly': 'Mensuel',
                                'semi-monthly': 'Quinzaine',
                                'bi-weekly': 'T. les 2 sem.',
                                'weekly': 'Hebdo',
                                'annually': 'Annuel'
                               };
                               return (
                                <button
                                  key={freq}
                                  onClick={() => setConfig(prev => ({ ...prev, payFrequency: freq }))}
                                  className={`text-xs font-medium py-2 px-3 border rounded-lg transition-all ${
                                    config.payFrequency === freq 
                                    ? 'bg-black text-white border-black shadow-sm hover:bg-white hover:text-black' 
                                    : 'bg-white border-slate-200 text-black hover:bg-black hover:text-white'
                                  } shadow-sm`}
                                >
                                  {labels[freq]}
                                </button>
                               );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-blue-900/80 uppercase tracking-wider italic">Déduction pour Résidence (DPR)</h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={config.hasClergyDeduction}
                            onChange={(e) => handleInputChange('hasClergyDeduction', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                          <span className="ms-2 text-[10px] font-bold text-black uppercase">{config.hasClergyDeduction ? 'Activé' : 'Désactivé'}</span>
                        </label>
                      </div>
                      
                      <div className={`grid grid-cols-1 gap-4 transition-opacity ${!config.hasClergyDeduction ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-blue-900/70">Valeur Locative de la Résidence (VLM)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-blue-900/40">$</span>
                            <input 
                              type="number"
                              disabled={!config.hasClergyDeduction}
                              value={config.housingFMV}
                              onChange={(e) => handleInputChange('housingFMV', e.target.value)}
                              className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded text-sm outline-none text-black transition-all"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-blue-900/70">Services Publics (Électricité, etc.)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-blue-900/40">$</span>
                            <input 
                              type="number"
                              disabled={!config.hasClergyDeduction}
                              value={config.utilities}
                              onChange={(e) => handleInputChange('utilities', e.target.value)}
                              className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded text-sm outline-none text-black transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleSaveToHistory}
                    className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm hover:bg-white hover:text-black border border-transparent hover:border-black transition-colors shadow-lg flex items-center justify-center gap-2"
                  >
                    <Save size={16} /> Enregistrer dans l'historique
                  </button>
                </section>
              </motion.div>
            ) : (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]"
              >
                <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center text-black">
                  <h3 className="text-sm font-bold uppercase tracking-widest">Enregistrements</h3>
                  <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded font-bold text-black">{history.length} ÉLÉMENTS</span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 italic font-medium text-black">
                  {history.length === 0 ? (
                    <div className="p-8 text-center space-y-3">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-blue-900/20">
                        <History size={24} />
                      </div>
                      <p className="text-xs text-blue-900/40 uppercase font-bold tracking-tighter">Aucun enregistrement sauvegardé</p>
                    </div>
                  ) : (
                    history.map((record) => (
                      <div key={record.id} className="p-4 bg-blue-900 border border-white text-white group transition-colors flex items-center justify-between hover:bg-black m-2 rounded-lg shadow-sm">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => handleLoadHistory(record)}
                        >
                          <div className="text-xs font-bold text-white uppercase">
                            {record.config.payrollMonth} {record.config.payrollYear}
                          </div>
                          <div className="text-[10px] text-white/70 flex items-center gap-2 mt-1">
                            <DollarSign size={10} /> Net: {formatCurrency(record.results.netPay)}
                          </div>
                          <div className="text-[9px] text-white/50 mt-0.5 italic">
                            Sauvegardé le {new Date(record.dateCreated).toLocaleDateString('fr-CA')}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteHistory(record.id)}
                          className="p-2 text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-all font-bold"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        <section className="lg:col-span-8 flex flex-col space-y-6">
          <AnimatePresence mode="wait">
            {(activeTab === 'input' || activeTab === 'history') && (
              <motion.div
                key="payslip-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
                  <div className="bg-black p-5 rounded-xl shadow-md transition-transform hover:scale-[1.02] text-white">
                    <p className="text-[10px] font-bold text-white/70 uppercase flex items-center gap-2">
                      <DollarSign size={12} /> Revenu Brut
                    </p>
                    <p className="text-xl font-bold mt-1">{formatCurrency(results.grossIncome)}</p>
                  </div>
                  <div className="bg-red-600 p-5 rounded-xl shadow-md transition-transform hover:scale-[1.02] text-white">
                    <p className="text-[10px] font-bold text-red-100 uppercase flex items-center gap-2">
                      <ShieldCheck size={12} /> Total Fédéral
                    </p>
                    <p className="text-xl font-bold mt-1">-{formatCurrency(results.totalFederalDeductions)}</p>
                  </div>
                  <div className="bg-blue-600 p-5 rounded-xl shadow-md transition-transform hover:scale-[1.02] text-white">
                    <p className="text-[10px] font-bold text-blue-100 uppercase flex items-center gap-2">
                      <TrendingDown size={12} /> Total Provincial (QC)
                    </p>
                    <p className="text-xl font-bold mt-1">-{formatCurrency(results.totalProvincialDeductions)}</p>
                  </div>
                  <div className="bg-green-600 p-5 rounded-xl shadow-lg transition-transform hover:scale-[1.02] text-white">
                    <p className="text-[10px] font-bold text-green-100 uppercase flex items-center gap-2">
                      <ShieldCheck size={12} /> Salaire Net Estimé
                    </p>
                    <motion.p 
                      key={results.netPay}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xl font-bold mt-1"
                    >
                      {formatCurrency(results.netPay)}
                    </motion.p>
                  </div>
                </div>

                <div ref={payslipRef} data-payslip="true" className={`bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col print:border-none shadow-sm text-black w-full mx-auto ${exporting ? 'w-[1024px] min-w-[1024px]' : 'max-w-[1024px]'}`}>
                  <div className={`p-4 md:p-8 border-b border-slate-200 bg-white grid grid-cols-1 ${exporting ? 'grid-cols-2' : 'sm:grid-cols-2'} gap-6 md:gap-8`}>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-black">
                        <Building2 size={18} />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-black">COORDONNÉES EMPLOYEUR</span>
                      </div>
                      <div className="font-bold text-base md:text-lg text-black">{EMPLOYER_INFO.name}</div>
                      <div className="text-[10px] md:text-xs text-blue-900/80 leading-relaxed uppercase">
                        <p className="flex items-start gap-2 font-semibold"><MapPin size={10} className="text-black shrink-0 mt-0.5" /> {EMPLOYER_INFO.address}</p>
                        <p className="flex items-center gap-2 mt-1 font-semibold"><Phone size={10} className="text-black shrink-0" /> {EMPLOYER_INFO.phone}</p>
                      </div>
                    </div>
       
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-blue-900/60">
                        <User size={18} />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-black">COORDONNÉES EMPLOYÉ</span>
                      </div>
                      <div className="font-bold text-base md:text-lg text-black">{config.employeeName || "Employé non spécifié"}</div>
                      <div className="text-[10px] md:text-xs text-blue-900/80 leading-relaxed uppercase">
                        <p className="font-mono text-[10px] md:text-[11px] font-bold text-black">NAS: {config.employeeSIN || "___-___-___"}</p>
                        <p className="uppercase mt-1 text-[9px] md:text-[10px] font-bold">{config.employeeAddress || "Aucune adresse fournie"}</p>
                        <p className="mt-2 font-bold text-white uppercase tracking-widest bg-black inline-block px-3 py-1 rounded text-[9px] md:text-[10px]">
                          Période de Paie: {config.payrollMonth} {config.payrollYear}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto scrollbar-hide">
                    <table className={`w-full text-left ${exporting ? 'text-sm' : 'text-[11px] md:text-sm'}`}>
                      <thead className="bg-black border-b border-slate-200 text-white">
                        <tr>
                          <th className="px-4 md:px-6 py-3 md:py-4 font-bold uppercase tracking-wider">Description</th>
                          <th className="px-4 md:px-6 py-3 md:py-4 font-bold uppercase tracking-wider">Entité</th>
                          <th className="px-4 md:px-6 py-3 md:py-4 font-bold uppercase tracking-wider text-right">Montant</th>
                        </tr>
                      </thead>
                      <tbody className="italic font-medium text-black">
                        <tr className="bg-white border-b border-slate-100">
                          <td className="px-4 md:px-6 py-3 md:py-4">Salaire Brut de la Période</td>
                          <td className="px-4 md:px-6 py-3 md:py-4 text-blue-900/40 italic">Employeur</td>
                          <td className="px-4 md:px-6 py-3 md:py-4 text-right font-black">{formatCurrency(results.grossIncome)}</td>
                        </tr>
                        {config.hasClergyDeduction && (
                          <tr className="bg-white border-b border-slate-100">
                            <td className="px-4 md:px-6 py-3 md:py-4">Déduction pour Résidence du Clergé</td>
                            <td className="px-4 md:px-6 py-3 md:py-4 text-blue-900/40 italic">Ajustement Fiscal</td>
                            <td className="px-4 md:px-6 py-3 md:py-4 text-right">-{formatCurrency(results.clergyResidenceDeduction)}</td>
                          </tr>
                        )}
                        
                        {/* Federal Section */}
                        <tr className="bg-red-700 border-t border-slate-200">
                          <td colSpan={3} className="px-4 md:px-6 py-2 text-[10px] font-black text-white uppercase tracking-widest border-l-4 border-white font-sans">Déductions Fédérales</td>
                        </tr>
                        <tr className="bg-red-50 text-red-900">
                          <td className="px-4 md:px-6 py-2.5 md:py-3 pl-8">Impôt Fédéral sur le Revenu</td>
                          <td className="px-4 md:px-6 py-2.5 md:py-3 text-red-400 italic font-bold">ARC</td>
                          <td className="px-4 md:px-6 py-2.5 md:py-3 text-right font-black">-{formatCurrency(results.federalTax)}</td>
                        </tr>
                        <tr className="bg-red-50/50 text-red-900 border-b border-red-100">
                          <td className="px-4 md:px-6 py-2.5 md:py-3 pl-8">Assurance-Emploi (AE)</td>
                          <td className="px-4 md:px-6 py-2.5 md:py-3 text-red-400 italic font-bold">ARC</td>
                          <td className="px-4 md:px-6 py-2.5 md:py-3 text-right font-black">-{formatCurrency(results.ei)}</td>
                        </tr>
                        <tr className="bg-red-800 text-white font-bold border-b border-slate-200">
                          <td className="px-4 md:px-6 py-2 pl-8 text-[10px] md:text-[11px] uppercase border-l-4 border-white" colSpan={2}>Sous-total Fédéral</td>
                          <td className="px-4 md:px-6 py-2 text-right font-black text-white">-{formatCurrency(results.totalFederalDeductions)}</td>
                        </tr>

                        {/* Provincial Section */}
                        <tr className="bg-blue-700 border-t border-slate-200">
                          <td colSpan={3} className="px-4 md:px-6 py-2 text-[10px] font-black text-white uppercase tracking-widest border-l-4 border-white font-sans">Déductions Provinciales (Québec)</td>
                        </tr>
                        <tr className="bg-blue-50 text-blue-900">
                          <td className="px-4 md:px-6 py-2.5 md:py-3 pl-8">Impôt provincial / Santé</td>
                          <td className="px-4 md:px-6 py-2.5 md:py-3 text-blue-400 italic font-bold">Revenu Québec</td>
                          <td className="px-4 md:px-6 py-2.5 md:py-3 text-right font-black">-{formatCurrency(results.provincialTax)}</td>
                        </tr>
                        <tr className="bg-blue-50/50 text-blue-900">
                          <td className="px-4 md:px-6 py-2.5 md:py-3 pl-8">Régime de Rentes du Québec (RRQ)</td>
                          <td className="px-4 md:px-6 py-2.5 md:py-3 text-blue-400 italic font-bold">Retraite QC</td>
                          <td className="px-4 md:px-6 py-2.5 md:py-3 text-right font-black">-{formatCurrency(results.qpp)}</td>
                        </tr>
                        <tr className="bg-blue-50 text-blue-900 border-b border-blue-100">
                          <td className="px-4 md:px-6 py-2.5 md:py-3 pl-8">Régime Québécois d'Assurance Parentale (RQAP)</td>
                          <td className="px-4 md:px-6 py-2.5 md:py-3 text-blue-400 italic font-bold">RQAP</td>
                          <td className="px-4 md:px-6 py-2.5 md:py-3 text-right font-black">-{formatCurrency(results.qpip)}</td>
                        </tr>
                        <tr className="bg-blue-800 text-white font-bold border-b border-slate-200">
                          <td className="px-4 md:px-6 py-2 pl-8 text-[10px] md:text-[11px] uppercase border-l-4 border-white" colSpan={2}>Sous-total Québec</td>
                          <td className="px-4 md:px-6 py-2 text-right font-black text-white">-{formatCurrency(results.totalProvincialDeductions)}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="bg-white border-t-2 border-slate-200 text-black">
                          <td className="px-4 md:px-6 py-3 md:py-4 text-base md:text-lg font-black" colSpan={2}>Total des Déductions</td>
                          <td className="px-4 md:px-6 py-3 md:py-4 text-right text-base md:text-lg font-black">-{formatCurrency(results.totalDeductions)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  
                  <div className="p-4 md:p-6 bg-white border-t border-slate-200 text-black">
                    <div className="flex items-center justify-between text-[10px] md:text-[11px] font-black text-blue-900/40 uppercase tracking-widest mb-3">
                      <span>ÉQUIVALENTS ANNUELS CALCULÉS</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 text-[11px] md:text-xs font-bold text-blue-900/70">
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span>Revenu Brut Annuel:</span>
                        <span className="text-black font-black">{formatCurrency(results.grossIncome * (PAY_PERIODS[config.payFrequency]))}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span>Base Imposable Annuelle:</span>
                        <span className="text-black font-black">{formatCurrency(results.taxableIncome * (PAY_PERIODS[config.payFrequency]))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </section>
      </main>

      <footer className="max-w-[1400px] mx-auto px-8 py-6 text-xs text-blue-900/60 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <span>&copy; 2025 MISSION CHRÉTIENNE FONTAINE DE VIE. Calculs basés sur les tables de paie du Québec 2024/25.</span>
        <div className="flex items-center gap-4 uppercase tracking-tighter">
          <span>Conforme au formulaire T1223</span>
          <span className="w-1 h-1 bg-blue-900/30 rounded-full"></span>
          <span>Validé selon TP-76.G-V</span>
        </div>
      </footer>
    </div>
  );
}
