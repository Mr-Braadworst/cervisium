import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { UserAccount } from '../types';
import {
  AdminDashboardStats,
  AdminUserSummary,
  fetchAdminDashboardData,
  formatStorageGB,
  formatStorageMB,
  formatStorageHuman,
  isSuperAdmin,
  isOwnerEmail,
  updateAdminUserProfileLabel,
  verifyAdminServerSide,
  buildCompleteAdminExportJson,
  importCompleteAdminDataJson,
  AdminImportReport,
} from '../services/adminService';
import {
  ShieldCheck,
  Database,
  Users,
  Beer as BeerIcon,
  HardDrive,
  RefreshCw,
  Eye,
  ArrowLeft,
  Activity,
  Search,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Tag,
  Sparkles,
  Download,
  Upload,
  Lock,
  ChevronRight,
  Star,
  AlertTriangle,
  FileJson,
} from 'lucide-react';

interface AdminPanelViewProps {
  adminUser: UserAccount;
  currentlyViewingUser: UserAccount | null;
  onViewAsUser: (summary: AdminUserSummary) => void;
  onStopViewingAsUser: () => void;
  onBackToSettings: () => void;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  adminUser,
  currentlyViewingUser,
  onViewAsUser,
  onStopViewingAsUser,
  onBackToSettings,
}) => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState<string>('');
  const [previewUser, setPreviewUser] = useState<AdminUserSummary | null>(null);
  const [unitMode, setUnitMode] = useState<'auto' | 'mb' | 'gb'>('auto');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [savingUserLabel, setSavingUserLabel] = useState<boolean>(false);

  // Admin Export & Import states
  const [skipDuplicatesOnImport, setSkipDuplicatesOnImport] = useState<boolean>(true);
  const [importingAdminData, setImportingAdminData] = useState<boolean>(false);
  const [importProgressLabel, setImportProgressLabel] = useState<string>('');
  const [importProgressPct, setImportProgressPct] = useState<number>(0);
  const [importReport, setImportReport] = useState<AdminImportReport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const authorized = isSuperAdmin(adminUser);

  const loadStats = useCallback(async () => {
    if (!authorized) {
      setError('Geen toegang: dit paneel is uitsluitend toegankelijk voor de eigenaar.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const serverCheck = await verifyAdminServerSide(adminUser);
      if (!serverCheck.verified) {
        setError('Server-side Admin verificatie geweigerd (403 Forbidden).');
        setLoading(false);
        return;
      }
      const result = await fetchAdminDashboardData(adminUser);
      setStats(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Kon admin-gegevens niet ophalen.'
      );
    } finally {
      setLoading(false);
    }
  }, [adminUser, authorized]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const filteredUsers = useMemo(() => {
    if (!stats) return [];
    const q = userSearch.trim().toLowerCase();
    if (!q) return stats.users;
    return stats.users.filter(
      (u) =>
        u.user.name.toLowerCase().includes(q) ||
        u.user.email.toLowerCase().includes(q) ||
        u.user.id.toLowerCase().includes(q)
    );
  }, [stats, userSearch]);

  const handleExportFullAdminBackup = () => {
    if (!stats) return;
    try {
      const jsonString = buildCompleteAdminExportJson(stats, adminUser);
      const blob = new Blob([jsonString], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cervisium_complete_admin_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Exporteren mislukt.');
    }
  };

  const handleImportAdminFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      setImportError('Het geselecteerde JSON-bestand is groter dan het maximum van 100 MB.');
      return;
    }

    setImportingAdminData(true);
    setImportError(null);
    setImportReport(null);
    setImportProgressLabel('JSON-bestand inlezen & valideren...');
    setImportProgressPct(5);

    try {
      const rawText = await file.text();
      const report = await importCompleteAdminDataJson(
        rawText,
        adminUser,
        stats,
        { skipDuplicates: skipDuplicatesOnImport },
        (label, pct) => {
          setImportProgressLabel(label);
          setImportProgressPct(pct);
        }
      );
      setImportReport(report);
      await loadStats();
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'Importeren van het JSON-bestand is mislukt.'
      );
    } finally {
      setImportingAdminData(false);
    }
  };

  if (!authorized) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 rounded-3xl bg-zinc-900 border border-rose-500/40 text-center space-y-4 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-extrabold text-zinc-100">Toegang Geweigerd</h2>
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
          Dit beheerderspaneel is strikt beveiligd en uitsluitend toegankelijk voor het geverifieerde Google-account van de eigenaar.
        </p>
        <button
          onClick={onBackToSettings}
          className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
        >
          Terug naar Instellingen
        </button>
      </div>
    );
  }

  const usedPercent = stats
    ? Math.min(100, (stats.totalBytesUsed / stats.quotaBytes) * 100)
    : 0;

  // Schatting hoeveel bieren met foto (~120 KB per bier met gecomprimeerde foto) er nog bij passen
  const estimatedRemainingBeersWithPhoto = stats
    ? Math.floor(stats.totalBytesRemaining / (120 * 1024))
    : 0;

  const formatByMode = (bytes: number, isQuotaOrRemaining = false): string => {
    if (unitMode === 'gb') {
      return formatStorageGB(bytes, isQuotaOrRemaining ? 2 : 3);
    }
    if (unitMode === 'mb') {
      return formatStorageMB(bytes, isQuotaOrRemaining ? 1 : 2);
    }
    if (isQuotaOrRemaining) {
      return formatStorageGB(bytes, 2);
    }
    return formatStorageHuman(bytes);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-14">
      {/* Top Security & Admin Header */}
      <div className="bg-gradient-to-r from-amber-950/80 via-zinc-900 to-zinc-900 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onBackToSettings}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 text-xs font-bold border border-zinc-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Instellingen
              </button>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Geverifieerde Eigenaar
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight flex items-center gap-2.5 pt-1">
              Cervisium Beheer &amp; Admin Panel
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
              Realtime inzicht in je opslag (MB &amp; GB gebruikt en vrij), app-gebruik, geregistreerde accounts en de mogelijkheid om de website exact te bekijken zoals een specifieke gebruiker hem ziet.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={loadStats}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 text-xs sm:text-sm font-extrabold shadow-lg shadow-amber-500/20 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Scannen...' : 'Ververs Scan'}
            </button>

            {stats && (
              <button
                onClick={handleExportFullAdminBackup}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold transition-colors"
                title="Download alle gebruikers, rollen en records als JSON"
              >
                <Download className="w-4 h-4 text-amber-400" />
                Exporteer Data
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ADMIN DATA EXPORT & IMPORT (MIGRATIE & BACK-UP SECTIE) */}
      <div className="bg-zinc-900/90 border border-amber-500/30 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
              <FileJson className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-extrabold text-zinc-100">
                  Data Migratie: Exporteer &amp; Importeer Data
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Server-side Beveiligd
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 max-w-3xl">
                Exporteer één compleet JSON-bestand met alle geregistreerde gebruikers, rollen (<code className="text-amber-300">admin</code> / <code className="text-amber-300">user</code>), categorieën, biertjes, proefnotities, glazen en geüploade foto&apos;s, of importeer een bestaand bestand veilig.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* A. EXPORTEER DATA */}
          <div className="p-5 rounded-2xl bg-zinc-950/90 border border-zinc-800 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Download className="w-4 h-4" />
                1. Exporteer Alle Data (JSON)
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Download een volledige back-up met alle{' '}
                <strong className="text-zinc-200">{stats?.totalUsers ?? 0} gebruikers</strong>, hun rollen en alle bijbehorende records &amp; afbeeldingen.
              </p>
            </div>

            <button
              type="button"
              disabled={!stats || loading}
              onClick={handleExportFullAdminBackup}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
            >
              <Download className="w-4 h-4" />
              Exporteer Data (Compleet JSON-bestand)
            </button>
          </div>

          {/* B. IMPORTEER DATA */}
          <div className="p-5 rounded-2xl bg-zinc-950/90 border border-zinc-800 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Upload className="w-4 h-4" />
                2. Importeer Data (Beveiligde Upload)
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Laad een eerder geëxporteerd JSON-bestand in de database. Alle velden en afbeeldingen worden strikt gevalideerd.
              </p>

              <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={skipDuplicatesOnImport}
                  onChange={(e) => setSkipDuplicatesOnImport(e.target.checked)}
                  className="w-4 h-4 rounded accent-amber-500"
                />
                <span className="text-xs font-semibold text-zinc-200">
                  Sla duplicaten over (op basis van e-mailadres &amp; record-ID)
                </span>
              </label>
            </div>

            <div>
              <input
                type="file"
                accept=".json,application/json"
                id="admin-database-import-input"
                onChange={handleImportAdminFile}
                disabled={importingAdminData}
                className="hidden"
              />
              <label
                htmlFor="admin-database-import-input"
                className={`w-full py-3 px-4 rounded-xl border text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${
                  importingAdminData
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-500 cursor-wait'
                    : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20 cursor-pointer'
                }`}
              >
                <Upload className="w-4 h-4" />
                {importingAdminData
                  ? 'Bezig met valideren & importeren...'
                  : 'Importeer Data (.json bestand kiezen)'}
              </label>
            </div>
          </div>
        </div>

        {importingAdminData && (
          <div className="p-4 rounded-2xl bg-zinc-950 border border-amber-500/40 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-300">
              <span>{importProgressLabel}</span>
              <span>{importProgressPct}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-zinc-900 overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${importProgressPct}%` }}
              />
            </div>
          </div>
        )}

        {importError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {importReport && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs space-y-1.5">
            <div className="font-extrabold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Database-import succesvol afgerond!
            </div>
            <p className="text-zinc-300">
              <strong>Geïmporteerd:</strong> {importReport.usersImported} gebruikers,{' '}
              {importReport.beersImported} bieren, {importReport.tastingsImported} proefnotities,{' '}
              {importReport.glassesImported} bierglazen, {importReport.categoriesImported} categorieën en{' '}
              {importReport.pubDealsImported} kroeg-acties.
            </p>
            <p className="text-zinc-400">
              <strong>Overgeslagen duplicaten:</strong> {importReport.usersSkippedDuplicate} bestaande gebruikers &amp;{' '}
              {importReport.recordsSkippedDuplicate} bestaande records overgeslagen.
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs sm:text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !stats ? (
        <div className="p-14 rounded-3xl bg-zinc-900/70 border border-zinc-800 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
          <p className="text-sm font-bold text-zinc-200">
            Opslagcapaciteit en gebruikersprofielen worden gescand...
          </p>
          <p className="text-xs text-zinc-500">
            Alle collecties (bieren, proefnotities, bierglazen, categorieën en foto&apos;s) worden doorgerekend.
          </p>
        </div>
      ) : stats ? (
        <>
          {/* 1. SERVER OPSLAG, RAM-GEBRUIK & APP CAPACITEIT CARD */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-zinc-100">
                    Server Opslag, RAM-geheugen &amp; App Data
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Realtime meting van de schijfopslag van je server, het actuele RAM-gebruik en de ruimte van alle bieren &amp; foto&apos;s
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                {/* Eenheid schakelaar */}
                <div className="inline-flex items-center rounded-xl bg-zinc-950 border border-zinc-800 p-1 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setUnitMode('auto')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      unitMode === 'auto'
                        ? 'bg-amber-500 text-zinc-950'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Slim (KB/MB/GB)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitMode('mb')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      unitMode === 'mb'
                        ? 'bg-amber-500 text-zinc-950'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    MB
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitMode('gb')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      unitMode === 'gb'
                        ? 'bg-amber-500 text-zinc-950'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    GB
                  </button>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/80 border border-zinc-700 text-[11px] font-semibold text-zinc-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Scan: {new Date(stats.scannedAt).toLocaleTimeString('nl-NL')}
                </span>
              </div>
            </div>

            {/* SERVER OPSLAG (DISK) & SERVER RAM-GEBRUIK */}
            {stats.serverMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Server Schijfopslag */}
                {(() => {
                  const diskTotal = stats.serverMetrics.diskTotalBytes || stats.quotaBytes;
                  const diskUsed = stats.serverMetrics.diskUsedBytes || stats.totalBytesUsed;
                  const diskFree = stats.serverMetrics.diskFreeBytes || stats.totalBytesRemaining;
                  const effectiveTotal = diskUsed + diskFree > 0 ? diskUsed + diskFree : diskTotal;
                  const diskPct =
                    effectiveTotal > 0 ? Math.min(100, (diskUsed / effectiveTotal) * 100) : 0;

                  return (
                    <div className="p-5 rounded-2xl bg-zinc-950/90 border border-amber-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                          <HardDrive className="w-4 h-4" />
                          <span>Server Schijfopslag (Disk)</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-300">
                          {diskPct.toLocaleString('nl-NL', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                          % gebruikt
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-2xl font-black text-zinc-100 font-mono">
                          {formatByMode(diskUsed, false)}
                        </div>
                        <div className="text-xs text-zinc-400 font-mono">
                          van {formatByMode(diskTotal, true)} schijfruimte
                        </div>
                      </div>

                      <div className="w-full h-3 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden p-0.5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                          style={{ width: `${Math.max(diskPct, 2)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
                        <span>
                          Beschikbaar: <strong className="text-emerald-300">{formatByMode(diskFree, true)}</strong>
                        </span>
                        <span>
                          In MB: <strong className="text-zinc-300">{formatStorageMB(diskFree, 0)} vrij</strong>
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Server RAM-gebruik */}
                {(() => {
                  const ramTotal = stats.serverMetrics.ramTotalBytes || 1;
                  const ramUsed = stats.serverMetrics.ramUsedBytes || 0;
                  const ramFree = stats.serverMetrics.ramFreeBytes || 0;
                  const appRss = stats.serverMetrics.appRamRssBytes || 0;
                  const ramPct = Math.min(100, (ramUsed / ramTotal) * 100);

                  return (
                    <div className="p-5 rounded-2xl bg-zinc-950/90 border border-emerald-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <Activity className="w-4 h-4" />
                          <span>Server RAM-Geheugen</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-300">
                          {ramPct.toLocaleString('nl-NL', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                          % in gebruik
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-2xl font-black text-zinc-100 font-mono">
                          {formatByMode(ramUsed, false)}
                        </div>
                        <div className="text-xs text-zinc-400 font-mono">
                          van {formatByMode(ramTotal, true)} RAM
                        </div>
                      </div>

                      <div className="w-full h-3 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden p-0.5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-500"
                          style={{ width: `${Math.max(ramPct, 2)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
                        <span>
                          Beschikbaar RAM: <strong className="text-emerald-300">{formatByMode(ramFree, false)}</strong>
                        </span>
                        <span>
                          Cervisium Proces RAM: <strong className="text-amber-300">{formatStorageMB(appRss, 1)}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 3 App Data Cards: App Data Gebruikt / Foto's / Nog Ruimte Voor Bieren */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* App Data Gebruikt */}
              <div className="p-5 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <span>Cervisium Collectie &amp; Data</span>
                  <Database className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-zinc-100 font-mono">
                  {formatByMode(stats.totalBytesUsed, false)}
                </div>
                <div className="text-xs text-zinc-400 flex items-center justify-between pt-1">
                  <span>
                    Collectie: <strong className="text-zinc-200">{formatStorageMB(stats.totalBytesUsed, 2)}</strong>
                  </span>
                  {stats.serverMetrics?.dbSizeBytes && stats.serverMetrics.dbSizeBytes > 0 ? (
                    <span className="text-[11px] text-amber-300 font-semibold">
                      DB op schijf: {formatStorageMB(stats.serverMetrics.dbSizeBytes, 1)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-zinc-400">
                      In GB: <strong className="text-zinc-300">{formatStorageGB(stats.totalBytesUsed, 3)}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Resterend / Nog Over */}
              <div className="p-5 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <span>Vrije Opslagruimte</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono">
                  {formatByMode(stats.totalBytesRemaining, true)}
                </div>
                <div className="text-xs text-zinc-400 flex items-center justify-between pt-1">
                  <span>
                    Vrij in MB: <strong className="text-zinc-200">{formatStorageMB(stats.totalBytesRemaining, 0)}</strong>
                  </span>
                  <span className="text-[11px] text-emerald-400/90 font-semibold">
                    {formatStorageGB(stats.totalBytesRemaining, 2)} vrij
                  </span>
                </div>
              </div>

              {/* Schatting Bieren */}
              <div className="p-5 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  <span>Capaciteit voor Bieren</span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-zinc-100 font-mono">
                  {estimatedRemainingBeersWithPhoto.toLocaleString('nl-NL')}
                </div>
                <div className="text-xs text-zinc-400 flex items-center justify-between pt-1">
                  <span>Bieren incl. foto (~120 KB/bier)</span>
                  <span className="text-amber-300 font-semibold">Ruim voldoende</span>
                </div>
              </div>
            </div>

            {/* Uitsplitsing per Collectie & Foto's */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <div className="text-[11px] text-zinc-400">Bieren Collectie</div>
                <div className="text-sm font-extrabold text-zinc-100 mt-0.5">
                  {formatByMode(stats.collectionBytes.beers)}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {stats.totalBeers} {stats.totalBeers === 1 ? 'bier' : 'bieren'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <div className="text-[11px] text-zinc-400">Bierglazen</div>
                <div className="text-sm font-extrabold text-zinc-100 mt-0.5">
                  {formatByMode(stats.collectionBytes.glasses)}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {stats.totalGlasses} {stats.totalGlasses === 1 ? 'glas' : 'glazen'} ({stats.totalGlassPieces} stuks)
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <div className="text-[11px] text-zinc-400">Proefnotities</div>
                <div className="text-sm font-extrabold text-zinc-100 mt-0.5">
                  {formatByMode(stats.collectionBytes.tastings)}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {stats.totalTastings} {stats.totalTastings === 1 ? 'proefnotitie' : 'proefnotities'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <div className="text-[11px] text-zinc-400">Categorieën</div>
                <div className="text-sm font-extrabold text-zinc-100 mt-0.5">
                  {formatByMode(stats.collectionBytes.categories)}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {stats.totalCategories} {stats.totalCategories === 1 ? 'categorie' : 'categorieën'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <div className="text-[11px] text-zinc-400">Foto-opslag</div>
                <div className="text-sm font-extrabold text-amber-300 mt-0.5">
                  {formatByMode(stats.photoBytesUsed)}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {stats.totalPhotos} {stats.totalPhotos === 1 ? 'foto' : "foto's"}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <div className="text-[11px] text-zinc-400">Tekst &amp; Indexen</div>
                <div className="text-sm font-extrabold text-zinc-100 mt-0.5">
                  {formatByMode(stats.metadataBytesUsed)}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {stats.totalDocuments} {stats.totalDocuments === 1 ? 'document' : 'documenten'}
                </div>
              </div>
            </div>
          </div>

          {/* 2. APP GEBRUIK & STATISTIEKEN KPI'S */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">Gebruikers</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-zinc-100">{stats.totalUsers}</div>
              <div className="text-xs text-zinc-400 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                <span>{stats.activeUsersToday} vandaag actief &bull; {stats.activeUsersLast7Days} deze week</span>
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">Totaal Biertjes</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <BeerIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-zinc-100">{stats.totalBeers}</div>
              <div className="text-xs text-zinc-400">
                {stats.totalTastings} proefnotities &bull; gem.{' '}
                {stats.totalUsers > 0 ? (stats.totalBeers / stats.totalUsers).toFixed(1) : '0'} per gebruiker
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">Totaal Bierglazen</span>
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                  <Tag className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-zinc-100">{stats.totalGlasses}</div>
              <div className="text-xs text-zinc-400">
                {stats.totalGlassPieces} fysieke glazen in kasten &bull; {stats.totalCategories} bierstijlen
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">Geüploade Foto&apos;s</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <ImageIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-zinc-100">{stats.totalPhotos}</div>
              <div className="text-xs text-zinc-400">
                {formatStorageHuman(stats.photoBytesUsed)} aan afbeeldingen in database
              </div>
            </div>
          </div>

          {/* 3. GEBRUIKERSLIJST & "BEKIJK WEBSITE ALS GEBRUIKER" */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-zinc-100 flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-400" />
                    Alle Gebruikers ({stats.users.length})
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Alle geregistreerde gebruikers (inclusief accounts die rechtstreeks uit de collecties bieren, glazen, proefnotities en categorieën zijn gedetecteerd). Klik op een gebruiker om de website exact te bekijken zoals zij hem zien.
                  </p>
                </div>

                {/* Zoek gebruiker */}
                <div className="relative w-full sm:w-64 shrink-0">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Zoek op accountnaam of e-mail..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 bg-zinc-950/50 rounded-2xl border border-dashed border-zinc-800">
                  Geen gebruikers gevonden voor deze zoekopdracht.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.map((summary) => {
                    const isSelf = summary.user.id === adminUser.id || isOwnerEmail(summary.user.email);
                    const isCurrentlyImpersonating =
                      currentlyViewingUser?.id === summary.user.id;
                    const isEditingThisUser = editingUserId === summary.user.id;

                    return (
                      <div
                        key={summary.user.id}
                        onClick={() => onViewAsUser(summary)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                          isCurrentlyImpersonating
                            ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                            : 'bg-zinc-950/80 border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-950'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5 min-w-0">
                            {summary.user.avatarUrl ? (
                              <img
                                src={summary.user.avatarUrl}
                                alt={summary.user.name}
                                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-amber-500/30 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-extrabold text-lg flex items-center justify-center shrink-0">
                                {summary.user.name.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-extrabold text-zinc-100 group-hover:text-amber-300 transition-colors truncate">
                                  {summary.user.name}
                                </h3>
                                {isSelf && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Eigenaar (Jij)
                                  </span>
                                )}
                                {isCurrentlyImpersonating && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Nu aan het bekijken
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-zinc-400 truncate mt-0.5">
                                {summary.user.email ? (
                                  <span className="truncate font-mono">{summary.user.email}</span>
                                ) : (
                                  <span className="truncate text-zinc-500 italic">
                                    Klik op &lsquo;Naam aanpassen&rsquo; om de naam van dit account in te vullen
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2.5 mt-1.5 text-[11px] text-zinc-400 flex-wrap">
                                <span className="inline-flex items-center gap-1 font-semibold text-zinc-200">
                                  <BeerIcon className="w-3.5 h-3.5 text-amber-400" />
                                  {summary.beersCount} {summary.beersCount === 1 ? 'bier' : 'bieren'}
                                </span>
                                <span>&bull;</span>
                                <span>{summary.tastingsCount} {summary.tastingsCount === 1 ? 'proefnotitie' : 'proefnotities'}</span>
                                <span>&bull;</span>
                                <span>{summary.glassesCount} glazen ({summary.glassesTotalPieces} stuks)</span>
                                <span>&bull;</span>
                                <span>{summary.categoriesCount} categorieën</span>
                                <span>&bull;</span>
                                <span className="text-amber-300 font-mono">
                                  {formatStorageHuman(summary.storageBytes)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div
                            className="flex items-center gap-2 shrink-0 flex-wrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isEditingThisUser) {
                                    setEditingUserId(null);
                                  } else {
                                    setEditingUserId(summary.user.id);
                                    setEditName(
                                      summary.user.name.startsWith('Bierliefhebber Account #') ||
                                        summary.user.name.startsWith('Gebruiker (')
                                        ? ''
                                        : summary.user.name
                                    );
                                    setEditEmail(summary.user.email || '');
                                  }
                                }}
                                className="px-2.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
                              >
                                {isEditingThisUser ? 'Annuleren' : 'Naam aanpassen'}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                setPreviewUser(
                                  previewUser?.user.id === summary.user.id ? null : summary
                                )
                              }
                              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
                            >
                              {previewUser?.user.id === summary.user.id ? 'Sluit info' : 'Collectie info'}
                            </button>

                            <button
                              type="button"
                              onClick={() => onViewAsUser(summary)}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold shadow-md shadow-amber-500/20 transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Bekijk Website als {summary.user.name.split(' ')[0]}
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Inline formulier om naam/e-mail aan een bestaand database-account te koppelen */}
                        {isEditingThisUser && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-4 pt-3 border-t border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 cursor-default"
                          >
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Accountnaam invullen (bijv. voornaam)..."
                              className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                            />
                            <input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              placeholder="E-mailadres (optioneel)..."
                              className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                            />
                            <button
                              type="button"
                              disabled={savingUserLabel}
                              onClick={async () => {
                                setSavingUserLabel(true);
                                try {
                                  await updateAdminUserProfileLabel(
                                    adminUser,
                                    summary.user.id,
                                    editName,
                                    editEmail
                                  );
                                  setEditingUserId(null);
                                  await loadStats();
                                } finally {
                                  setSavingUserLabel(false);
                                }
                              }}
                              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-extrabold transition-colors shrink-0"
                            >
                              {savingUserLabel ? 'Opslaan...' : 'Opslaan'}
                            </button>
                          </div>
                        )}

                        {/* Uitklapbare snelle collectie-inspectie binnen het Admin Panel */}
                        {previewUser?.user.id === summary.user.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-4 pt-4 border-t border-zinc-800 space-y-3 cursor-default"
                          >
                            <div className="flex items-center justify-between text-xs text-zinc-400 flex-wrap gap-2">
                              <span>
                                Account: <strong className="text-zinc-200">{summary.user.name}</strong>
                              </span>
                              <span>
                                Laatst actief:{' '}
                                <strong className="text-zinc-200">
                                  {new Date(summary.lastActivityIso).toLocaleString('nl-NL')}
                                </strong>
                              </span>
                              <span>
                                Gemiddelde beoordeling:{' '}
                                <strong className="text-amber-400">
                                  {summary.avgRating > 0 ? `${summary.avgRating.toFixed(1)} / 10` : 'Nog geen scores'}
                                </strong>
                              </span>
                            </div>

                            {summary.beers.length === 0 && summary.glasses.length === 0 ? (
                              <p className="text-xs text-zinc-500 italic">
                                Deze gebruiker heeft nog geen biertjes of bierglazen toegevoegd ({summary.categoriesCount} categorieën aanwezig).
                              </p>
                            ) : (
                              <div className="space-y-2.5">
                                {summary.beers.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                                    {summary.beers.slice(0, 12).map((b) => (
                                      <div
                                        key={b.id}
                                        className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          {b.photoUrl ? (
                                            <img
                                              src={b.photoUrl}
                                              alt={b.name}
                                              className="w-8 h-8 rounded-lg object-cover shrink-0"
                                            />
                                          ) : (
                                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                                              <BeerIcon className="w-4 h-4" />
                                            </div>
                                          )}
                                          <div className="min-w-0">
                                            <div className="font-bold text-zinc-100 truncate">{b.name}</div>
                                            <div className="text-[10px] text-zinc-400 truncate">
                                              {b.brewery || 'Brouwerij onbekend'} &bull; {b.abv}%
                                            </div>
                                          </div>
                                        </div>
                                        {b.favorite && (
                                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {currentlyViewingUser && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
                  <div className="text-xs text-amber-200">
                    Je bekijkt de website momenteel als{' '}
                    <strong>{currentlyViewingUser.name}</strong> ({currentlyViewingUser.email}).
                  </div>
                  <button
                    onClick={onStopViewingAsUser}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold shrink-0"
                  >
                    Terug naar eigen account
                  </button>
                </div>
              )}
            </div>

            {/* 4. RECENTE APP ACTIVITEIT TIJDLIJN */}
            <div className="lg:col-span-4 bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h2 className="text-base font-extrabold text-zinc-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  Recente App Activiteit
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Laatste toevoegingen en sessies in de database
                </p>
              </div>

              {stats.recentActivity.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  Nog geen recente activiteit geregistreerd.
                </div>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {stats.recentActivity.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-amber-400 truncate">
                          {item.userName}
                        </span>
                        <span className="text-[10px] text-zinc-500 shrink-0">
                          {new Date(item.dateIso).toLocaleDateString('nl-NL', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-zinc-200 truncate">{item.title}</p>
                      <p className="text-[11px] text-zinc-400 truncate">{item.subtitle}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
