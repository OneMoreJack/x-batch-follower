
/**
 * Background Service Worker
 * Implements a concurrent worker pool (Semaphore) for high-speed processing
 */

let activeTask = null;
const MAX_CONCURRENT = 5;
const MIN_DELAY = 1500;
const MAX_DELAY = 2500;

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_TASK') {
      startConcurrentProcessing(message.accounts);
    } else if (message.type === 'STOP_TASK') {
      activeTask = null;
    }
  });
}

async function startConcurrentProcessing(accounts) {
  activeTask = {
    accounts: accounts.map(a => ({ ...a, status: 'pending' })),
    nextIndex: 0,
    activeCount: 0,
    stats: { success: 0, skipped: 0, failed: 0, total: accounts.length }
  };

  // Launch initial batch of workers
  for (let i = 0; i < Math.min(MAX_CONCURRENT, accounts.length); i++) {
    spawnWorker();
  }
}

async function spawnWorker() {
  if (!activeTask) return;

  // 1. Get next available account index
  const currentIndex = activeTask.nextIndex++;
  
  // 2. Check if we've reached the end of the list
  if (currentIndex >= activeTask.accounts.length) {
    checkTaskCompletion();
    return;
  }

  activeTask.activeCount++;
  const account = activeTask.accounts[currentIndex];
  account.status = 'processing';
  
  updateUIAndStorage();

  try {
    // 3. Execute the follow automation
    const result = await followOnX(account.username);
    
    if (result.status === 'success') {
      account.status = 'success';
      activeTask.stats.success++;
    } else if (result.status === 'skipped') {
      account.status = 'skipped';
      activeTask.stats.skipped++;
    } else {
      account.status = 'failed';
      account.error = result.error || 'Unknown error';
      activeTask.stats.failed++;
    }
  } catch (err) {
    account.status = 'failed';
    account.error = err.message;
    activeTask.stats.failed++;
  }

  activeTask.activeCount--;
  updateUIAndStorage();

  // 4. Random delay (1.5s - 2.5s)
  const delay = Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY)) + MIN_DELAY;
  
  if (activeTask) {
    setTimeout(() => {
      spawnWorker();
    }, delay);
  } else {
    checkTaskCompletion();
  }
}

function checkTaskCompletion() {
  if (!activeTask) return;
  
  const allProcessed = activeTask.accounts.every(a => a.status !== 'pending' && a.status !== 'processing');
  
  if (allProcessed && activeTask.activeCount === 0) {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'TASK_COMPLETE',
        accounts: activeTask.accounts,
        stats: activeTask.stats
      }).catch(() => {});
    }
    
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.remove('taskState');
    }
    activeTask = null;
  }
}

function updateUIAndStorage() {
  if (!activeTask || typeof chrome === 'undefined') return;
  
  const payload = {
    type: 'UPDATE_PROGRESS',
    accounts: activeTask.accounts,
    // Note: currentIndex in UI will track the highest index reached
    currentIndex: activeTask.nextIndex - 1, 
    stats: activeTask.stats
  };
  
  if (chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage(payload).catch(() => {
      // Popup closed, expected behavior
    });
  }

  if (chrome.storage?.local) {
    chrome.storage.local.set({ 
      taskState: {
        accounts: activeTask.accounts,
        currentIndex: activeTask.nextIndex - 1,
        stats: activeTask.stats,
        isProcessing: true
      }
    });
  }
}

/**
 * Core Automation Logic: Opens a hidden tab, executes script, then closes
 */
async function followOnX(username) {
  if (typeof chrome === 'undefined' || !chrome.tabs?.create) {
    return { status: 'failed', error: 'Extension environment missing' };
  }

  return new Promise(async (resolve) => {
    let tab;
    try {
      tab = await chrome.tabs.create({ 
        url: `https://x.com/${username}`, 
        active: false 
      });

      // Polling for completion to handle SPA navigation better
      let tabLoaded = false;
      const checkLoad = setInterval(async () => {
        try {
          const t = await chrome.tabs.get(tab.id);
          if (t.status === 'complete') {
            clearInterval(checkLoad);
            tabLoaded = true;
            executeAutomation();
          }
        } catch (e) {
          clearInterval(checkLoad);
        }
      }, 500);

      // Timeout after 20s (faster timeout for concurrent mode)
      const timeout = setTimeout(() => {
        clearInterval(checkLoad);
        if (!tabLoaded) {
          if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
          resolve({ status: 'failed', error: 'Page load timeout' });
        }
      }, 20000);

      async function executeAutomation() {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['execute.js']
          });

          clearTimeout(timeout);
          if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});

          if (results && results[0]?.result) {
            resolve(results[0].result);
          } else {
            resolve({ status: 'failed', error: 'Script injection failed' });
          }
        } catch (err) {
          clearTimeout(timeout);
          if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
          resolve({ status: 'failed', error: err.message });
        }
      }
    } catch (e) {
      resolve({ status: 'failed', error: e.message });
    }
  });
}
