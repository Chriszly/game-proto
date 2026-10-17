import { DEFAULTS, SETTING_FIELDS, SETTINGS_KEY, loadSettings, saveSettings, type Settings } from './settings';
import { language, setLanguage, t } from './i18n';
import { previewVolume } from './audio';

/**
 * Builds the hub's Settings panel inside `root` from `SETTING_FIELDS`, so a new setting shows up
 * without touching the page. Changes save at once and apply the next time a game opens, except
 * the language, which the hub switches to at once: `onLanguage` is called to translate the page.
 */
export function mountSettingsPanel(root: HTMLElement, onLanguage: () => void = () => {}) {
  let current = loadSettings();
  const set = (patch: Partial<Settings>) => {
    current = { ...current, ...patch };
    saveSettings(current);
    if (current.language !== language()) {
      setLanguage(current.language);
      onLanguage();
    }
    render();
  };

  const rows = document.createElement('div');
  rows.className = 'settings-rows';
  root.append(rows);

  const actions = document.createElement('div');
  actions.className = 'settings-actions';
  const restore = action('restore-defaults', () => set(DEFAULTS));
  const reset = action('reset-progress', () => {
    if (!confirm(t('resetProgressConfirm'))) return;
    clearProgress();
  });
  actions.append(restore, reset);
  root.append(actions);

  function render() {
    restore.textContent = t('restoreDefaults');
    reset.textContent = t('resetProgress');
    rows.replaceChildren(
      ...SETTING_FIELDS.map((field) => {
        const row = document.createElement('div');
        row.className = 'setting';
        const name = document.createElement('div');
        name.className = 'setting-name';
        const label = t(field.label);
        name.textContent = label;
        const hint = document.createElement('div');
        hint.className = 'setting-hint';
        hint.textContent = t(field.hint);
        if (field.kind === 'range') {
          row.append(name, rangeInput(field, label), hint);
          return row;
        }
        const choices = document.createElement('div');
        choices.className = 'setting-choices';
        choices.setAttribute('role', 'group');
        choices.setAttribute('aria-label', label);
        const options =
          field.kind === 'toggle'
            ? [
                { value: false, text: t('off') },
                { value: true, text: t('on') },
              ]
            : field.options.map((o) => ({ value: o.value, text: 'text' in o ? o.text : t(o.label) }));
        for (const option of options) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = option.text;
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
  /** A slider saves as it moves, without drawing the panel again, which would let go of it. */
  function rangeInput(field: Extract<(typeof SETTING_FIELDS)[number], { kind: 'range' }>, label: string) {
    const wrap = document.createElement('div');
    wrap.className = 'setting-range';
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(field.min);
    input.max = String(field.max);
    input.step = String(field.step);
    input.value = String(current[field.key]);
    input.setAttribute('aria-label', label);
    const value = document.createElement('output');
    value.textContent = input.value;
    input.addEventListener('input', () => {
      current = { ...current, [field.key]: Number(input.value) };
      saveSettings(current);
      value.textContent = input.value;
    });
    // Let go of the slider: play a sample at the new volume.
    input.addEventListener('change', () => previewVolume(field.key, current));
    wrap.append(input, value);
    return wrap;
  }

  render();
}

function action(id: string, onClick: () => void) {
  const button = document.createElement('button');
  button.type = 'button';
  button.id = id;
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
