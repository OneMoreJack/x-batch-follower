
/**
 * Script injected into X profile page to perform follow
 */
(async function() {
  // 1. Check if logged in
  // X.com usually has a login button if not logged in
  const loginButton = document.querySelector('a[href="/login"]');
  if (loginButton) {
    return { status: 'failed', error: 'Please login to X first' };
  }

  // 2. Wait for the Follow button to appear (it's often lazy-loaded)
  async function findFollowButton(timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      // Look for buttons with specific testid or aria-label
      const buttons = Array.from(document.querySelectorAll('[role="button"]'));
      
      // Look for "Following" status first
      const isFollowing = buttons.some(b => {
        const text = b.innerText?.toLowerCase() || '';
        const label = b.getAttribute('aria-label')?.toLowerCase() || '';
        return text.includes('following') || label.includes('following');
      });
      
      if (isFollowing) return 'already_following';

      // Look for "Follow" button
      const followBtn = buttons.find(b => {
        const text = b.innerText?.trim() || '';
        const label = (b.getAttribute('aria-label') || '').toLowerCase();
        // Check text is exactly "Follow" or label starts with follow
        return text === 'Follow' || (label.startsWith('follow @') && !label.includes('following'));
      });

      if (followBtn) return followBtn;

      await new Promise(r => setTimeout(r, 500));
    }
    return null;
  }

  const result = await findFollowButton();

  if (result === 'already_following') {
    return { status: 'skipped', message: 'Already followed' };
  }

  if (result && typeof result !== 'string') {
    // Click it
    result.click();
    
    // Brief wait to ensure click is registered
    await new Promise(r => setTimeout(r, 1500));
    
    return { status: 'success' };
  }

  return { status: 'failed', error: 'Follow button not found (30s timeout)' };
})();
