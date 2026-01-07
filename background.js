
/**
 * Background Service Worker
 * Enhanced with Speed Mode and Group Breaks for safety
 */

let activeTask = null;

const SPEED_CONFIGS = {
  fast: {
    maxConcurrent: 3,
    minDelay: 1000,
    maxDelay: 3000,
    groupSize: 5,
    groupRest: 3000
  },
  medium: {
    maxConcurrent: 3,
    minDelay: 3000,
    maxDelay: 6000,
    groupSize: 5,
    groupRest: 5000
  },
  slow: {
    maxConcurrent: 2,
    minDelay: 6000,
    maxDelay: 10000,
    groupSize: 5,
    groupRest: 7000
  }
};

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_TASK') {
      startTask(message.accounts, message.speedMode || 'medium');
    } else if (message.type === 'STOP_TASK') {
      stopAndCleanup();
    }
  });
}

function stopAndCleanup() {
  if (activeTask) {
    // 将所有处理中的账号恢复为 pending，避免 UI 圈圈一直转
    const resetAccounts = activeTask.accounts.map(a => 
      a.status === 'processing' ? { ...a, status: 'pending' } : a
    );
    
    chrome.runtime.sendMessage({ 
      type: 'TASK_COMPLETE', // 使用 COMPLETE 类型让 UI 停止
      accounts: resetAccounts,
      stats: activeTask.stats
    }).catch(() => {});
  }
  
  activeTask = null;
  chrome.storage.local.remove('taskState');
}

async function startTask(accounts, speedMode) {
  const config = SPEED_CONFIGS[speedMode];
  
  activeTask = {
    accounts: accounts.map(a => ({ ...a, status: 'pending' })),
    speedMode: speedMode,
    config: config,
    nextIndex: 0,
    activeCount: 0,
    successInSession: 0,
    isResting: false,
    stats: { success: 0, skipped: 0, failed: 0, total: accounts.length, isResting: false }
  };

  // Launch initial workers
  for (let i = 0; i < Math.min(config.maxConcurrent, accounts.length); i++) {
    spawnWorker();
  }
}

async function spawnWorker() {
  if (!activeTask) return;

  if (activeTask.isResting) return;

  const currentIndex = activeTask.nextIndex++;
  
  if (currentIndex >= activeTask.accounts.length) {
    checkTaskCompletion();
    return;
  }

  activeTask.activeCount++;
  const account = activeTask.accounts[currentIndex];
  account.status = 'processing';
  
  updateUIAndStorage();

  try {
    const result = await followOnX(account.username);
    
    // 如果在等待过程中任务被停止了，直接退出
    if (!activeTask) return;

    if (result.status === 'success') {
      account.status = 'success';
      activeTask.stats.success++;
      activeTask.successInSession++;
    } else if (result.status === 'skipped') {
      account.status = 'skipped';
      activeTask.stats.skipped++;
    } else {
      account.status = 'failed';
      account.error = result.error || 'Unknown error';
      activeTask.stats.failed++;
    }
  } catch (err) {
    if (!activeTask) return;
    account.status = 'failed';
    account.error = err.message;
    activeTask.stats.failed++;
  }

  activeTask.activeCount--;
  updateUIAndStorage();

  if (activeTask.successInSession >= activeTask.config.groupSize && activeTask.activeCount === 0) {
    activeTask.isResting = true;
    activeTask.stats.isResting = true;
    updateUIAndStorage();
    
    setTimeout(() => {
      if (!activeTask) return;
      activeTask.isResting = false;
      activeTask.stats.isResting = false;
      activeTask.successInSession = 0;
      updateUIAndStorage();
      
      for (let i = 0; i < activeTask.config.maxConcurrent; i++) {
        spawnWorker();
      }
    }, activeTask.config.groupRest);
    
    return;
  }

  const delay = Math.floor(Math.random() * (activeTask.config.maxDelay - activeTask.config.minDelay)) + activeTask.config.minDelay;
  
  if (activeTask && !activeTask.isResting) {
    setTimeout(() => {
      spawnWorker();
    }, delay);
  }
}

function checkTaskCompletion() {
  if (!activeTask) return;
  const allProcessed = activeTask.accounts.every(a => a.status !== 'pending' && a.status !== 'processing');
  
  if (allProcessed && activeTask.activeCount === 0) {
    chrome.runtime.sendMessage({
      type: 'TASK_COMPLETE',
      accounts: activeTask.accounts,
      stats: activeTask.stats
    }).catch(() => {});
    
    chrome.storage.local.remove('taskState');
    activeTask = null;
  }
}

function updateUIAndStorage() {
  if (!activeTask) return;
  
  const payload = {
    type: 'UPDATE_PROGRESS',
    accounts: activeTask.accounts,
    currentIndex: activeTask.nextIndex - 1, 
    stats: activeTask.stats
  };
  
  chrome.runtime.sendMessage(payload).catch(() => {});
  chrome.storage.local.set({ 
    taskState: { ...payload, isProcessing: true, speedMode: activeTask.speedMode }
  });
}

async function followOnX(username) {
  return new Promise(async (resolve) => {
    let tab;
    try {
      tab = await chrome.tabs.create({ url: `https://x.com/${username}`, active: false });
      
      const checkLoad = setInterval(async () => {
        try {
          const t = await chrome.tabs.get(tab.id);
          if (t.status === 'complete') {
            clearInterval(checkLoad);
            executeAutomation();
          }
        } catch (e) { clearInterval(checkLoad); }
      }, 500);

      const timeout = setTimeout(() => {
        clearInterval(checkLoad);
        if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
        resolve({ status: 'failed', error: 'Page load timeout' });
      }, 20000);

      async function executeAutomation() {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['execute.js']
          });
          clearTimeout(timeout);
          if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
          resolve(results?.[0]?.result || { status: 'failed', error: 'Script injection failed' });
        } catch (err) {
          clearTimeout(timeout);
          if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
          resolve({ status: 'failed', error: err.message });
        }
      }
    } catch (e) { resolve({ status: 'failed', error: e.message }); }
  });
}
