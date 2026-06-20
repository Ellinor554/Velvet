/**
 * Application entry point.
 *
 * Responsibilities:
 *   - Boot order: nav → screens → reactive subscriptions
 *   - Wire cross-screen callbacks (screen changes, badge updates)
 *   - Import pwa.js as a side-effect (auto-registers the service worker)
 *
 * This file coordinates; it does not contain logic.
 */

import { initNav, switchScreen, updateSavedBadge } from './ui/nav.js';
import { initHomeScreen }                           from './ui/homeScreen.js';
import { initDiscoverScreen }                       from './ui/discoverScreen.js';
import { initSavedScreen, renderSavedScreen }       from './ui/savedScreen.js';
import { subscribe, getState }                      from './core/store.js';
import './pwa.js';

async function init() {
  // Navigation — switchScreen() is now available app-wide via nav.js
  initNav(id => {
    if (id === 'saved') renderSavedScreen();
  });

  // Sync saved badge with store on every change, and once immediately on load
  updateSavedBadge(getState().saved.length);
  subscribe(state => updateSavedBadge(state.saved.length));

  // One-time event wiring for the saved screen (survives re-renders)
  initSavedScreen();

  // Load screen data in parallel — neither depends on the other
  await Promise.all([
    initHomeScreen(),
    initDiscoverScreen(),
  ]);
}

init().catch(err => console.error('[App] Init failed:', err));
