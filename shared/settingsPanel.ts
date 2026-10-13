import { DEFAULTS, SETTING_FIELDS, SETTINGS_KEY, loadSettings, saveSettings, type Settings } from './settings';

/**
 * Builds the hub's Settings panel inside `root` from `SETTING_FIELDS`, so a new setting shows up
 * without touching the page. Changes save at once and apply the next time a game opens.
 */
export function mountSettingsPanel(root: HTMLElement) {
  let current = loadSettings();
  const set = (patch: Partial<Settings>) => {
    current = { ...current, ...patch };
    saveSettings(current);
    render();
  };

  const rows = document.createElement('div');
  rows.className = 'settings-rows';
  root.append(rows);

  const actions = document.createElement('div');
  actions.className = 'settings-actions';
  actions.append(
    action('Restore defaults', 'restore-defaults', () => set(DEFAULTS)),
    action('Reset all progress', 'reset-progress', () => {
      if (!confirm('Erase the saved progress of every game? Settings are kept.')) return;
      clearProgress();
    }),
  );
  root.append(actions);

  function render() {
    rows.replaceChildren(
      ...SETTING_FIELDS.map((field) => {
        const row = document.createElement('div');
        row.className = 'setting';
        const name = document.createElement('div');
        name.className = 'setting-name';
        name.textContent = field.label;
        const hint = document.createElement('div');
        hint.className = 'setting-hint';
        hint.textContent = field.hint;
        const choices = document.createElement('div');
        choices.className = 'setting-choices';
        choices.setAttribute('role', 'group');
        choices.setAttribute('aria-label', field.label);
        const options = field.kind === 'toggle' ? [{ value: false, label: 'Off' }, { value: true, label: 'On' }] : field.options;
        for (const option of options) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = option.label;
          const chosen = current[field.key] === option.value;
          button.setAttribute('aria-pressed', String(chosen));
          button.addEventListener('click', () => set({ [field.key]: option.value } as Partial<Settings>));
          choices.append(button);
        }
        row.append(name, choices, hint);
        return row;
      }),
    );
  }
  render();
}

function action(label: string, id: string, onClick: () => void) {
  const button = document.createElement('button');
  button.type = 'button';
  button.id = id;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

/** Removes every game's saves from the shared origin, keeping the settings. */
function clearProgress() {
  try {
    for (const key of Object.keys(localStorage)) if (key !== SETTINGS_KEY) localStorage.removeItem(key);
  } catch {
    // Storage is blocked, so nothing was saved.
  }
}
