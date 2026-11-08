import React, { useState, useEffect, useCallback } from 'react';
import { UserAccount, FriendUser } from '../types';
import {
  fetchFriendsList,
  acceptFriendInvite,
  removeFriend,
  buildInviteLink,
} from '../services/friendsService';
import { ConfirmModal } from './ConfirmModal';
import { QrShowModal, QrScanModal } from './QrCodeModal';
import {
  Users,
  UserPlus,
  Copy,
  Check,
  Share2,
  Trash2,
  Beer,
  Wine,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Mail,
  AlertCircle,
  RefreshCw,
  Eye,
  QrCode,
  Camera,
} from 'lucide-react';

interface FriendsViewProps {
  activeUser: UserAccount;
  onViewFriendList: (friend: FriendUser) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  activeUser,
  onViewFriendList,
}) => {
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [friendToRemove, setFriendToRemove] = useState<FriendUser | null>(null);

  // QR Code Modals
  const [showQrModalOpen, setShowQrModalOpen] = useState(false);
  const [scanQrModalOpen, setScanQrModalOpen] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);

  const [customDomain, setCustomDomain] = useState<string>(() => {
    try {
      return localStorage.getItem('bierlog_custom_domain') || '';
    } catch {
      return '';
    }
  });

  const loadFriends = useCallback(async () => {
    setLoading(true);
    const list = await fetchFriendsList();
    setFriends(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFriends();
    fetch('/api/system/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.customDomain) {
          setCustomDomain(d.customDomain);
          try {
            localStorage.setItem('bierlog_custom_domain', d.customDomain);
          } catch {}
        }
      })
      .catch(() => {});
  }, [loadFriends]);

  const inviteUrl = buildInviteLink(activeUser.id, customDomain);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;

    setAdding(true);
    setStatusMessage(null);

    const res = await acceptFriendInvite(code);
    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      setManualCode('');
      await loadFriends();
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
    setAdding(false);
  };

  const handleRemoveFriend = async () => {
    if (!friendToRemove) return;
    const ok = await removeFriend(friendToRemove.id);
    if (ok) {
      setFriends((prev) => prev.filter((f) => f.id !== friendToRemove.id));
      setStatusMessage({ type: 'success', text: `${friendToRemove.name} is ontkoppeld.` });
    } else {
      setStatusMessage({ type: 'error', text: 'Kon vriend niet ontkoppelen.' });
    }
    setFriendToRemove(null);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Hoi! Laten we vrienden worden op Cervisium om elkaars biercollecties en ratings te bekijken 🍻: ${inviteUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent('Uitnodiging Cervisium Bier-App');
    const body = encodeURIComponent(
      `Hoi!\n\nIk nodig je uit om vrienden te worden op Cervisium, mijn persoonlijke biercollectie app. Klik op deze link om direct te koppelen:\n\n${inviteUrl}\n\nProost! 🍻`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleQrScanned = async (scannedCode: string) => {
    if (!scannedCode || isProcessingScan) return;
    setIsProcessingScan(true);
    setStatusMessage(null);
    const res = await acceptFriendInvite(scannedCode);
    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      setScanQrModalOpen(false);
      await loadFriends();
    } else {
      setStatusMessage({ type: 'error', text: res.message });
      setScanQrModalOpen(false);
    }
    setIsProcessingScan(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900 via-amber-950/30 to-zinc-900 border border-amber-500/20 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
              <Users className="w-3.5 h-3.5" />
              Samen Proosten &amp; Delen
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
              Vrienden &amp; Collecties
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Deel je persoonlijke uitnodigingslink of laat je QR-code scannen. Zodra je vriend de link opent of scant, worden jullie accounts gekoppeld!
            </p>
          </div>

          <button
            onClick={loadFriends}
            className="self-start md:self-auto p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 text-zinc-300 transition-colors flex items-center gap-2 text-xs font-semibold"
            title="Vernieuwen"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Vernieuwen
          </button>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-sm font-semibold transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            &times;
          </button>
        </div>
      )}

      {/* Section 1: Jouw Uitnodigingslink Card */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-800/80 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Jouw Persoonlijke Uitnodigingslink &amp; QR-Code</h2>
              <p className="text-xs text-zinc-400">
                Stuur je link via WhatsApp/E-mail of toon jouw persoonlijke QR-code.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowQrModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-extrabold transition-all shadow-md shadow-amber-500/10 cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-amber-400" />
            Toon Mijn QR-Code 📱
          </button>
        </div>

        {/* Link Input Box */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              onClick={handleCopyLink}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-xs font-mono text-amber-300 pr-10 focus:outline-none cursor-pointer select-all"
            />
          </div>

          <button
            onClick={handleCopyLink}
            className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 ${
              copied
                ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                Gekopieerd!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Kopieer Link
              </>
            )}
          </button>
        </div>

        {/* Quick Share Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2">
          <button
            onClick={() => setShowQrModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-colors"
          >
            <QrCode className="w-4 h-4" />
            Bekijk QR-Code
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Deel via WhatsApp
          </button>

          <button
            onClick={handleShareEmail}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-bold transition-colors"
          >
            <Mail className="w-4 h-4" />
            Deel via E-mail
          </button>
        </div>
      </div>

      {/* Section 2: Handmatig Uitnodiging / QR Scannen */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-amber-400" />
            Vriend Uitnodiging Accepteren
          </h2>

          <button
            type="button"
            onClick={() => setScanQrModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Camera className="w-4 h-4 text-zinc-950" />
            Scan QR-Code van Vriend 📷
          </button>
        </div>

        <form onSubmit={handleManualAdd} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            placeholder="Plak uitnodigingscode (bijv. usr_...) of e-mailadres van vriend..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={adding || !manualCode.trim()}
            className="px-5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-100 text-xs font-bold transition-colors shrink-0 flex items-center justify-center gap-2"
          >
            {adding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Koppelen
          </button>
        </form>
      </div>

      {/* Section 3: Mijn Vriendenlijst */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            Mijn Vrienden ({friends.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
            <p className="text-xs">Vriendenlijst laden...</p>
          </div>
        ) : friends.length === 0 ? (
          <div className="p-12 text-center bg-zinc-900/50 border border-zinc-800/80 rounded-3xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 text-zinc-500 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-200">Nog geen vrienden gekoppeld</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Kopieer hierboven jouw persoonlijke uitnodigingslink en stuur deze naar je bier-vrienden! Zodra zij de link openen verschijnen ze in dit overzicht.
              </p>
            </div>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
            >
              <Copy className="w-4 h-4" />
              Kopieer Uitnodigingslink
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 rounded-3xl p-5 space-y-4 transition-all hover:shadow-xl group flex flex-col justify-between"
              >
                {/* Friend Info Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {friend.avatarUrl ? (
                      <img
                        src={friend.avatarUrl}
                        alt={friend.name}
                        className="w-12 h-12 rounded-2xl object-cover ring-2 ring-amber-500/20"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 text-amber-300 font-bold flex items-center justify-center text-base">
                        {friend.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">
                        {friend.name}
                      </h3>
                      <p className="text-xs text-zinc-400 truncate max-w-[180px]">
                        {friend.email}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setFriendToRemove(friend)}
                    className="p-1.5 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Vriend ontkoppelen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <Beer className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-extrabold text-zinc-100">{friend.beerCount}</div>
                      <div className="text-[10px] text-zinc-500">Bieren</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Wine className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-extrabold text-zinc-100">{friend.tastingCount}</div>
                      <div className="text-[10px] text-zinc-500">Proefnotities</div>
                    </div>
                  </div>
                </div>

                {/* Action: View Friend's List */}
                <button
                  onClick={() => onViewFriendList(friend)}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4 stroke-[2.5]" />
                  Bekijk Bierlijst 🍺
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Removing Friend */}
      {friendToRemove && (
        <ConfirmModal
          isOpen={Boolean(friendToRemove)}
          onCancel={() => setFriendToRemove(null)}
          onConfirm={handleRemoveFriend}
          title="Vriend Ontkoppelen"
          message={`Weet je zeker dat je de koppeling met ${friendToRemove.name} wilt beëindigen? Je kunt hierna niet meer elkaars bierlijst bekijken.`}
          confirmLabel="Ontkoppelen"
          cancelLabel="Annuleren"
        />
      )}

      {/* QR Show Modal */}
      <QrShowModal
        isOpen={showQrModalOpen}
        onClose={() => setShowQrModalOpen(false)}
        inviteUrl={inviteUrl}
        userName={activeUser.name}
      />

      {/* QR Scan Modal */}
      <QrScanModal
        isOpen={scanQrModalOpen}
        onClose={() => setScanQrModalOpen(false)}
        onScanned={handleQrScanned}
        isProcessing={isProcessingScan}
      />
    </div>
  );
};
