# Session Modal Auto-Close Test Plan

## Test Case 1: Modal Closes on Mouse Movement

**Steps:**
1. Log in to the application
2. Manually set session expiration to 2 minutes from now:
   ```javascript
   // In browser console:
   localStorage.setItem('sessionExpiration', Date.now() + (2 * 60 * 1000));
   ```
3. Wait for the "Session Expiring Soon" modal to appear
4. Move your mouse anywhere on the page
5. **Expected Result:** Modal should close within 100ms

**Pass Criteria:**
- ✅ Modal closes immediately after mouse movement
- ✅ Console shows: "🎯 User activity detected - auto-extending session"
- ✅ Console shows: "🔄 Session extended by 10 minutes"
- ✅ Console shows: "🔔 Session extension event received, re-checking status immediately"
- ✅ Console shows: "✅ Session auto-extended and dialog dismissed"

## Test Case 2: Modal Closes on Key Press

**Steps:**
1. Log in to the application
2. Set session expiration to 2 minutes from now
3. Wait for modal to appear
4. Press any key on the keyboard
5. **Expected Result:** Modal should close within 100ms

**Pass Criteria:**
- ✅ Modal closes immediately after key press
- ✅ Same console messages as Test Case 1

## Test Case 3: Modal Closes on Click

**Steps:**
1. Log in to the application
2. Set session expiration to 2 minutes from now
3. Wait for modal to appear
4. Click anywhere on the page (outside the modal)
5. **Expected Result:** Modal should close within 100ms

**Pass Criteria:**
- ✅ Modal closes immediately after click
- ✅ Same console messages as Test Case 1

## Test Case 4: Multiple Tabs Synchronization

**Steps:**
1. Open the application in two browser tabs
2. In both tabs, set session expiration to 2 minutes from now
3. Wait for modal to appear in both tabs
4. In Tab 1, move your mouse
5. **Expected Result:** Modal should close in BOTH tabs

**Pass Criteria:**
- ✅ Modal closes in Tab 1 immediately
- ✅ Modal closes in Tab 2 immediately (due to custom event)
- ✅ Both tabs show the session extension console messages

## Test Case 5: Rapid Activity (Debouncing)

**Steps:**
1. Log in to the application
2. Set session expiration to 2 minutes from now
3. Wait for modal to appear
4. Rapidly move mouse multiple times (10+ movements in 1 second)
5. **Expected Result:** Modal closes, but `extendSession` is only called once

**Pass Criteria:**
- ✅ Modal closes immediately
- ✅ Console shows only ONE "🔄 Session extended by 10 minutes" message
- ✅ No excessive API calls or state updates

## Test Case 6: Session Extension Failure

**Steps:**
1. Log in to the application
2. Set session expiration to 2 minutes from now
3. Wait for modal to appear
4. Simulate extension failure (requires code modification or network error)
5. Move your mouse
6. **Expected Result:** Modal should remain open

**Pass Criteria:**
- ✅ Modal stays visible
- ✅ Console shows: "❌ Failed to auto-extend session"
- ✅ User can still click "Logout Now" button

## Test Case 7: Session Actually Expires

**Steps:**
1. Log in to the application
2. Set session expiration to 10 seconds from now:
   ```javascript
   localStorage.setItem('sessionExpiration', Date.now() + (10 * 1000));
   ```
3. Wait for modal to appear
4. Do NOT perform any activity
5. Wait for session to expire
6. **Expected Result:** User should be logged out automatically

**Pass Criteria:**
- ✅ Modal appears at 2 minutes (or 10 seconds in this test)
- ✅ Timer counts down
- ✅ User is logged out when timer reaches 0
- ✅ Console shows: "🔒 Session expired due to inactivity, logging out..."

## Test Case 8: Timer Updates Before Closing

**Steps:**
1. Log in to the application
2. Set session expiration to 2 minutes from now
3. Wait for modal to appear
4. Observe the timer for 5 seconds (should count down)
5. Move your mouse
6. **Expected Result:** Timer updates during countdown, then modal closes

**Pass Criteria:**
- ✅ Timer shows "2 minutes" initially
- ✅ Timer counts down (may show "1 minute" after 60 seconds)
- ✅ Modal closes immediately when activity is detected
- ✅ No visual glitches or timer jumping

## Automated Test Execution

To run the existing automated tests:

```bash
cd frontend
npm test -- SessionWarningDialog.test.tsx
```

**Expected Results:**
- ✅ All existing tests should pass
- ✅ No new test failures introduced by the fix

## Browser Console Commands for Testing

```javascript
// Set session to expire in 2 minutes
localStorage.setItem('sessionExpiration', Date.now() + (2 * 60 * 1000));

// Set session to expire in 10 seconds (for quick testing)
localStorage.setItem('sessionExpiration', Date.now() + (10 * 1000));

// Check current session expiration
const exp = localStorage.getItem('sessionExpiration');
const remaining = (parseInt(exp) - Date.now()) / 1000;
console.log(`Session expires in ${remaining} seconds`);

// Force session warning to show
localStorage.setItem('sessionExpiration', Date.now() + (90 * 1000)); // 90 seconds = 1.5 minutes

// Clear session expiration
localStorage.removeItem('sessionExpiration');
```

## Notes

- The modal has a 100ms debounce on activity detection to prevent excessive API calls
- The session check interval is 15 seconds, but the custom event ensures immediate updates
- The fix maintains backward compatibility with existing code
- No changes to component props or API signatures

