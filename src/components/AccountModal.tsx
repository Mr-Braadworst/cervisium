import React, { useState } from 'react';
import { UserAccount, Category, Beer, Tasting, BeerGlass } from '../types';
import {
  getAllUsers,
  exportUserData,
  importUserData,
  ImportedBackupPayload,
} from '../services/storage';
import { ConfirmModal } from './ConfirmModal';
import { X, User, Check, Download, Upload, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: UserAccount;
  categories?: Category[];
  beers?: Beer[];
  tastings?: Tasting[];
  glasses?: BeerGlass[];
  onSwitchUser: (user: UserAccount) => void;
  onDataImported: (importedData?: ImportedBackupPayload) => Promise<void> | void;
  onResetToSampleData: () => void;
  onClearAllData: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  activeUser,
  categories,
  beers,
  tastings,
  glasses,
  onSwitchUser,
  onDataImported,
  onResetToSampleData,
  onClearAllData,
}) => {
  const [users] = useState<UserAccount[]>(getAllUsers());
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const handleExport = () => {
    const jsonStr = exportUserData(activeUser.id, {
      categories,
      beers,
      tastings,
      glasses,
    });
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cervisium_${activeUser.name.toLowerCase().replace(/[^a-z0-9_-]/gi, '_')}_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      setImportStatus('Fout: Back-up bestand is te groot (maximaal 100 MB toegestaan).');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = importUserData(activeUser.id, content);
      if (res.success && res.count) {
        setImportStatus(
          `Succesvol geïmporteerd: ${res.count.categories} categorieën, ${res.count.beers} bieren, ${res.count.tastings} proefnotities, ${res.count.glasses || 0} glazen én ${res.count.photos || 0} geüploade foto's!`
        );
        await onDataImported(res.importedData);
      } else {
        setImportStatus(`Fout: ${res.message || 'Kon bestand niet lezen'}`);
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl p-6 text-zinc-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">Gebruikersaccount &amp; Data</h2>
              <p className="text-xs text-zinc-400">Persoonlijke opslag per gebruiker</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Account Box */}
        <div className="mt-5 p-4 rounded-xl bg-zinc-950 border border-amber-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {activeUser.avatarUrl ? (
              <img
                src={activeUser.avatarUrl}
                alt={activeUser.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-500/40"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-base border border-amber-500/40">
                {activeUser.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-zinc-100">{activeUser.name}</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" /> Ingelogd
                </span>
              </div>
              <div className="text-xs text-zinc-400 font-mono mt-0.5">{activeUser.email}</div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
              Actief Profiel
            </span>
          </div>
        </div>

        {/* Account isolation guarantee message */}
        <div className="mt-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong>Persoonlijke Data Garantie:</strong> Alle bieren, scores en aangemaakte categorieën worden exclusief opgeslagen voor dit profiel en zijn niet zichtbaar voor andere accounts.
          </span>
        </div>

        {/* Switch Account List */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Beschikbare Google Profielen ({users.length})
            </span>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {users.map((u) => {
              const isCurrent = u.id === activeUser.id;
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    onSwitchUser(u);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-colors text-left ${
                    isCurrent
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-semibold'
                      : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-medium">{u.name}</div>
                      <div className="text-[10px] text-zinc-500">{u.email}</div>
                    </div>
                  </div>
                  {isCurrent && <Check className="w-4 h-4 text-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Data Backup & Export / Import */}
        <div className="mt-6 pt-4 border-t border-zinc-800">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">
            Data Back-up &amp; Export
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              Download JSON Back-up
            </button>

            <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Importeer JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>

          {importStatus && (
            <div className="mt-2.5 p-2 rounded-lg bg-zinc-950 border border-amber-500/30 text-amber-300 text-xs text-center">
              {importStatus}
            </div>
          )}
        </div>

        {/* Sample data or clean reset options */}
        <div className="mt-5 pt-4 border-t border-zinc-800 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              if (confirm('Wil je een set van 5 bekende craft bieren en categorieën laden als voorbeeld?')) {
                onResetToSampleData();
                onClose();
              }
            }}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-amber-400 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Laad voorbeeld bieren (Demo)
          </button>

          <button
            onClick={() => setConfirmClearOpen(true)}
            className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 transition-colors"
          >
            <AlertCircle className="w-3 h-3" />
            Wis mijn data (Leeg)
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmClearOpen}
        title="Alle gegevens wissen?"
        message="Weet je zeker dat je alle bieren, proefnotities en categorieën van dit profiel definitief wilt wissen?"
        confirmLabel="Ja, alles wissen"
        onConfirm={() => {
          onClearAllData();
          onClose();
        }}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  );
};
