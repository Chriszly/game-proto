import { DEFAULTS, SETTING_FIELDS, loadSettings, saveSettings, type Settings } from './settings';
import { language, setLanguage, t } from './i18n';
import { previewVolume } from './audio';
import { clearAllProgress } from './progress';

/**
 * Builds the hub's Settings panel inside `root` from `SETTING_FIELDS`, so a new setting shows up
 * without touching the page. Changes save at once and apply the next time a game opens, except
 * the language, which the hub switches to at once, and the hub-only settings: `onChange` is called
 * after every change to update the page. Below the settings, a Saved progress row deletes the saves
 * of every game in `games` (their folder names) and calls `onChange` too, and the panel ends with
 * Restore defaults and Done, which closes the dialog.
 */
export function mountSettingsPanel(
  root: HTMLElement,
  onChange: (settings: Settings) => void = () => {},
  games: string[] = [],
) {
  let current = loadSettings();
  const set = (patch: Partial<Settings>) => {
    current = { ...current, ...patch };
    saveSettings(current);
    if (current.language !== language()) setLanguage(current.language);
    onChange(current);
    render();
  };

  const rows = document.createElement('div');
  rows.className = 'settings-rows';
  root.append(rows);

  // Deleting progress sits in a row of its own, apart from the buttons that end the panel.
  const progress = document.createElement('div');
  progress.className = 'setting';
  const progressName = document.createElement('div');
  progressName.className = 'setting-name';
  const progressHint = document.createElement('div');
  progressHint.className = 'setting-hint';
  const reset = action('reset-progress', () => {
    if (!confirm(t('resetProgressConfirm'))) return;
    clearAllProgress(games);
    onChange(current);
  });
  const resetRow = document.createElement('div');
  resetRow.className = 'setting-choices';
  resetRow.append(reset);
  progress.append(progressName, resetRow, progressHint);
  root.append(progress);

  const actions = document.createElement('div');
  actions.className = 'settings-actions';
  const restore = action('restore-defaults', () => set(DEFAULTS));
  const done = action('settings-done', () => root.closest('dialog')?.close());
  done.className = 'primary';
  actions.append(restore, done);
  root.append(actions);

  function render() {
    restore.textContent = t('restoreDefaults');
    done.textContent = t('done');
    reset.textContent = t('resetProgress');
    progressName.textContent = t('savedProgress');
    progressHint.textContent = t('savedProgressHint');
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
          // The language shown can differ from the setting for a quick look with `?lang=`.
          const chosen = (field.key === 'language' ? language() : current[field.key]) === option.value;
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
