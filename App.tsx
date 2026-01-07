import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Account, TaskStats, MessageType, SpeedMode } from './types';

declare const chrome: any;

const App: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [stats, setStats] = useState<TaskStats>({ success: 0, skipped: 0, failed: 0, total: 0, isResting: false });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [hasScanned, setHasScanned] = useState(false);
  const [speedMode, setSpeedMode] = useState<SpeedMode>(SpeedMode.MEDIUM);

  const hasChromeApi = typeof chrome !== 'undefined' && !!chrome.runtime?.id;
  const selectedCount = useMemo(() => accounts.filter(a => a.selected).length, [accounts]);
  const allSelected = useMemo(() => accounts.length > 0 && accounts.every(a => a.selected), [accounts]);

  const extractAccountsFromPage = useCallback(() => {
    if (!hasChromeApi) return;
    setIsScanning(true);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any) => {
      const currentTab = tabs[0];
      if (currentTab?.id) {
        const isX = currentTab.url?.includes('x.com') || currentTab.url?.includes('twitter.com');
        
        chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          files: ['content.js']
        }, (results: any) => {
          setIsScanning(false);
          setHasScanned(true);
          if (results && results[0]?.result && results[0].result.length > 0) {
            const extracted = results[0].result;
            const newAccounts: Account[] = extracted.map((item: any) => ({
              id: Math.random().toString(36).substr(2, 9),
              username: item.username,
              avatar: item.avatar || undefined,
              url: `https://x.com/${item.username}`,
              selected: true,
              status: 'pending'
            }));
            setAccounts(newAccounts);
            setErrorMsg(null);
          } else {
            setAccounts([]);
            if (!isX) {
              setErrorMsg("Please navigate to x.com to find profiles.");
            } else {
              setErrorMsg("No accounts found on this page.");
            }
          }
        });
      } else {
        setIsScanning(false);
      }
    });
  }, [hasChromeApi]);

  useEffect(() => {
    if (!hasChromeApi) {
      setIsScanning(false);
      return;
    }

    chrome.storage?.local.get(['taskState'], (result: any) => {
      if (result.taskState) {
        setAccounts(result.taskState.accounts || []);
        setIsProcessing(result.taskState.isProcessing || false);
        setCurrentIndex(result.taskState.currentIndex || -1);
        setStats(result.taskState.stats || { success: 0, skipped: 0, failed: 0, total: 0 });
        setHasScanned(true);
        setIsScanning(false);
        if (result.taskState.speedMode) setSpeedMode(result.taskState.speedMode);
      } else {
        extractAccountsFromPage();
      }
    });

    const listener = (message: any) => {
      if (message.type === MessageType.UPDATE_PROGRESS) {
        setAccounts(message.accounts);
        setCurrentIndex(message.currentIndex);
        setStats(message.stats);
        setIsProcessing(true);
      } else if (message.type === MessageType.TASK_COMPLETE) {
        setIsProcessing(false);
        setStats(message.stats);
        setAccounts(message.accounts);
      } else if (message.type === 'ERROR') {
        setErrorMsg(message.message);
        setIsProcessing(false);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [hasChromeApi, extractAccountsFromPage]);

  const startTask = () => {
    const selected = accounts.filter(a => a.selected);
    if (selected.length === 0 || !hasChromeApi) return;
    setIsProcessing(true);
    chrome.runtime.sendMessage({ 
      type: MessageType.START_TASK, 
      accounts: selected,
      speedMode 
    });
  };

  const stopTask = () => {
    setIsProcessing(false);
    setAccounts(prev => prev.map(a => a.status === 'processing' ? { ...a, status: 'pending' } : a));
    if (hasChromeApi) {
      chrome.runtime.sendMessage({ type: MessageType.STOP_TASK });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-[#0f1419] selection:bg-[#0f1419]/10">
      <header className="px-4 py-3 flex items-center justify-between border-b border-[#eff3f4] bg-white z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-black rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </div>
          <span className="font-black text-base tracking-tight">One-Click Follower</span>
        </div>
        {!isScanning && (
          <button 
            onClick={extractAccountsFromPage}
            disabled={isProcessing}
            className="text-xs font-bold px-3 py-1.5 rounded-full border border-[#cfd9de] hover:bg-[#0f1419]/5 transition-colors disabled:opacity-50"
          >
            Rescan
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col min-h-0 relative">
        {isScanning ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[#536471] text-sm font-bold">Scanning page for profiles...</p>
          </div>
        ) : !hasScanned || accounts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-[#f7f9f9] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[#536471]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-xl font-black mb-2">No profiles found</h2>
            <p className="text-[#536471] text-sm mb-8 leading-relaxed px-4">
              {errorMsg?.includes('x.com') 
                ? "Navigate to a profile list, search results, or followers page on X to begin."
                : "No usernames were detected on this specific area of the page."}
            </p>
            <button 
              onClick={extractAccountsFromPage}
              className="w-full bg-[#0f1419] text-white py-3.5 rounded-full font-bold text-sm hover:bg-[#272c30] transition-all shadow-sm active:scale-95"
            >
              Scan Current Page
            </button>
          </div>
        ) : (
          <>
            <div className="bg-[#f7f9f9] px-4 py-3 border-b border-[#eff3f4]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold text-[#536471] uppercase tracking-widest">Execution Speed</span>
                {speedMode === SpeedMode.FAST && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 animate-pulse">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    CRITICAL RISK
                  </div>
                )}
              </div>
              <div className="flex bg-[#eff3f4] p-1 rounded-full relative mb-2">
                {[
                  { label: 'Slow', mode: SpeedMode.SLOW },
                  { label: 'Medium', mode: SpeedMode.MEDIUM },
                  { label: 'Fast', mode: SpeedMode.FAST }
                ].map((option) => (
                  <button
                    key={option.mode}
                    disabled={isProcessing}
                    onClick={() => setSpeedMode(option.mode)}
                    className={`flex-1 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 ${
                      speedMode === option.mode 
                        ? 'bg-white text-black shadow-sm' 
                        : 'text-[#536471] hover:text-black'
                    } disabled:opacity-50`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              
              <div className="px-1">
                {speedMode === SpeedMode.SLOW && (
                  <p className="text-[10px] text-[#536471] leading-tight">
                    <strong className="text-green-600">Safest:</strong> Mimics human behavior with 6-10s intervals. Recommended for accounts with high follower counts or new accounts.
                  </p>
                )}
                {speedMode === SpeedMode.MEDIUM && (
                  <p className="text-[10px] text-[#536471] leading-tight">
                    <strong className="text-blue-600">Balanced:</strong> Standard 3-6s intervals. Good for regular daily growth without triggering most flags.
                  </p>
                )}
                {speedMode === SpeedMode.FAST && (
                  <p className="text-[10px] text-orange-700 leading-tight">
                    <strong className="text-orange-700">Dangerous:</strong> 1-3s intervals. May trigger X anti-bot detection, leading to <strong>temporary suspension, shadowbanning, or captcha loops.</strong>
                  </p>
                )}
              </div>
            </div>

            {(isProcessing || stats.total > 0) && (
              <div className="bg-[#f7f9f9] px-4 py-3 flex justify-between items-center border-b border-[#eff3f4]">
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-[#536471]">SUCCESS</p>
                    <p className="text-sm font-black">{stats.success}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-[#536471]">FAIL</p>
                    <p className="text-sm font-black text-red-600">{stats.failed}</p>
                  </div>
                </div>
                {stats.isResting && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-black text-white rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Resting...</span>
                  </div>
                )}
                <div className="text-right">
                  <p className="text-[10px] font-bold text-[#536471]">PROGRESS</p>
                  <p className="text-sm font-black">{Math.round(((stats.success + stats.skipped + stats.failed) / (stats.total || 1)) * 100)}%</p>
                </div>
              </div>
            )}

            <div className="px-4 py-2 bg-white flex items-center justify-between border-b border-[#eff3f4]">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={allSelected}
                  disabled={isProcessing}
                  onChange={() => {
                    const next = !allSelected;
                    setAccounts(prev => prev.map(a => ({ ...a, selected: next })));
                  }}
                  className="w-4 h-4 rounded border-[#cfd9de] text-black focus:ring-black cursor-pointer"
                />
                <span className="text-xs font-bold text-[#536471] group-hover:text-black">Select All</span>
              </label>
              <span className="text-[10px] font-bold text-[#536471] uppercase tracking-widest">{accounts.length} Profiles Found</span>
            </div>

            <div className="flex-1 overflow-y-auto list-container bg-white">
              <ul className="divide-y divide-[#eff3f4]">
                {accounts.map((acc, idx) => (
                  <li 
                    key={acc.id} 
                    className={`flex items-center px-4 py-3 transition-colors ${currentIndex === idx ? 'bg-[#0f1419]/5' : 'hover:bg-[#f7f9f9]'}`}
                  >
                    <input
                      type="checkbox"
                      checked={acc.selected}
                      disabled={isProcessing}
                      onChange={() => setAccounts(prev => prev.map(a => a.id === acc.id ? {...a, selected: !a.selected} : a))}
                      className="w-4 h-4 rounded border-[#cfd9de] text-black focus:ring-black cursor-pointer"
                    />
                    
                    <div className="ml-3 w-9 h-9 rounded-full bg-[#eff3f4] overflow-hidden shrink-0 border border-[#eff3f4]">
                      {acc.avatar ? (
                        <img src={acc.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#536471]">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </div>
                      )}
                    </div>

                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#0f1419] truncate leading-none mb-1">@{acc.username}</p>
                      <p className="text-[10px] text-[#536471] truncate">https://x.com/{acc.username}</p>
                    </div>
                    
                    <div className="ml-2 shrink-0">
                      {acc.status === 'processing' && <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>}
                      {acc.status === 'success' && <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></div>}
                      {acc.status === 'failed' && <span className="text-red-600 font-bold text-[10px] border border-red-600 px-1 rounded" title={acc.error}>FAIL</span>}
                      {acc.status === 'skipped' && <span className="text-[#536471] font-bold text-[10px]">SKIP</span>}
                      {acc.status === 'resting' && <span className="text-blue-500 font-bold text-[10px] animate-pulse">REST</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </main>

      {hasScanned && !isScanning && accounts.length > 0 && (
        <footer className="p-4 bg-white border-t border-[#eff3f4]">
          {!isProcessing ? (
            <button
              onClick={startTask}
              disabled={selectedCount === 0}
              className="w-full bg-[#0f1419] text-white py-3 rounded-full font-black text-sm hover:bg-[#272c30] disabled:bg-[#cfd9de] transition-all active:scale-[0.98] shadow-sm"
            >
              Follow {selectedCount} Selected
            </button>
          ) : (
            <button
              onClick={stopTask}
              className="w-full bg-white text-red-600 border border-red-600/30 py-3 rounded-full font-black text-sm hover:bg-red-50 transition-all"
            >
              Stop Processing
            </button>
          )}
        </footer>
      )}

      {errorMsg && (
        <div className="absolute bottom-20 left-4 right-4 bg-black text-white text-[11px] p-3 rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-2 z-50">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="flex-1">{errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="text-white/50 hover:text-white">✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;