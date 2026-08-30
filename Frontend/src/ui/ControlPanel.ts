import type { GraphSettings } from '../models/GraphSettings';

export class ControlPanel {
  private root: HTMLElement;
  private onApply: (settings: GraphSettings) => void;

  private yearSelect!: HTMLSelectElement;
  private keywordCountInput!: HTMLInputElement;
  private minWeightInput!: HTMLInputElement;
  private keywordCountValue!: HTMLSpanElement;
  private minWeightValue!: HTMLSpanElement;
  private showLabelsInput!: HTMLInputElement;
  private showAxesInput!: HTMLInputElement;
  private showAxisLabelsInput!: HTMLInputElement;
  private showCategoryBandsInput!: HTMLInputElement;
  private showRelationshipEdgesInput!: HTMLInputElement;
  private showTimelineEdgesInput!: HTMLInputElement;
  private highlightLongLivedInput!: HTMLInputElement;
  private minActiveYearsInput!: HTMLInputElement;
  private minActiveYearsValue!: HTMLSpanElement;
  private storyModeInput!: HTMLInputElement;
  private applyButton!: HTMLButtonElement;

  constructor(
    root: HTMLElement,
    yearOptions: string[],
    initialSettings: GraphSettings,
    onApply: (settings: GraphSettings) => void
  ) {
    this.root = root;
    this.onApply = onApply;
    this.render(yearOptions, initialSettings);
  }

  private render(yearOptions: string[], initialSettings: GraphSettings): void {
    this.root.innerHTML = `
      <div class="kg-panel">
        <h2 class="kg-panel-title">Knowledge Timeline Controls</h2>

        <label class="kg-label" for="kg-year">Year</label>
        <select id="kg-year" class="kg-select"></select>

        <label class="kg-label" for="kg-keyword-count">Keyword Count</label>
        <input id="kg-keyword-count" class="kg-range" type="range" min="10" max="100" step="1" />
        <span id="kg-keyword-count-value" class="kg-value"></span>

        <label class="kg-label" for="kg-min-weight">Min Weight</label>
        <input id="kg-min-weight" class="kg-range" type="range" min="1" max="20" step="1" />
        <span id="kg-min-weight-value" class="kg-value"></span>

        <label class="kg-checkbox-row">
          <input id="kg-show-labels" type="checkbox" />
          <span>Show Labels</span>
        </label>

        <label class="kg-checkbox-row">
          <input id="kg-show-axes" type="checkbox" />
          <span>Show Axes</span>
        </label>

        <label class="kg-checkbox-row">
          <input id="kg-show-axis-labels" type="checkbox" />
          <span>Show Axis Labels</span>
        </label>

        <label class="kg-checkbox-row">
          <input id="kg-show-category-bands" type="checkbox" />
          <span>Show Category Bands</span>
        </label>

        <label class="kg-checkbox-row">
          <input id="kg-show-relationship-edges" type="checkbox" />
          <span>Show Relationship Edges</span>
        </label>

        <label class="kg-checkbox-row">
          <input id="kg-show-timeline-edges" type="checkbox" />
          <span>Show Timeline Edges</span>
        </label>

        <label class="kg-checkbox-row">
          <input id="kg-highlight-long-lived" type="checkbox" />
          <span>Highlight Long-Lived Keywords</span>
        </label>

        <label class="kg-label" for="kg-min-active-years">Minimum Active Years</label>
        <input id="kg-min-active-years" class="kg-range" type="range" min="2" max="10" step="1" />
        <span id="kg-min-active-years-value" class="kg-value"></span>

        <label class="kg-checkbox-row">
          <input id="kg-story-mode" type="checkbox" />
          <span>Story Mode</span>
        </label>

        <button id="kg-apply" class="kg-apply">Apply</button>
      </div>
    `;

    this.yearSelect = this.root.querySelector('#kg-year') as HTMLSelectElement;
    this.keywordCountInput = this.root.querySelector('#kg-keyword-count') as HTMLInputElement;
    this.minWeightInput = this.root.querySelector('#kg-min-weight') as HTMLInputElement;
    this.keywordCountValue = this.root.querySelector('#kg-keyword-count-value') as HTMLSpanElement;
    this.minWeightValue = this.root.querySelector('#kg-min-weight-value') as HTMLSpanElement;
    this.showLabelsInput = this.root.querySelector('#kg-show-labels') as HTMLInputElement;
    this.showAxesInput = this.root.querySelector('#kg-show-axes') as HTMLInputElement;
    this.showAxisLabelsInput = this.root.querySelector('#kg-show-axis-labels') as HTMLInputElement;
    this.showCategoryBandsInput = this.root.querySelector('#kg-show-category-bands') as HTMLInputElement;
    this.showRelationshipEdgesInput = this.root.querySelector('#kg-show-relationship-edges') as HTMLInputElement;
    this.showTimelineEdgesInput = this.root.querySelector('#kg-show-timeline-edges') as HTMLInputElement;
    this.highlightLongLivedInput = this.root.querySelector('#kg-highlight-long-lived') as HTMLInputElement;
    this.minActiveYearsInput = this.root.querySelector('#kg-min-active-years') as HTMLInputElement;
    this.minActiveYearsValue = this.root.querySelector('#kg-min-active-years-value') as HTMLSpanElement;
    this.storyModeInput = this.root.querySelector('#kg-story-mode') as HTMLInputElement;
    this.applyButton = this.root.querySelector('#kg-apply') as HTMLButtonElement;

    this.yearSelect.innerHTML = yearOptions
      .map(option => `<option value="${option}">${option}</option>`)
      .join('');

    this.yearSelect.value = initialSettings.year;
    this.keywordCountInput.value = String(initialSettings.keywordCount);
    this.minWeightInput.value = String(initialSettings.minWeight);
    this.showLabelsInput.checked = initialSettings.showLabels;
    this.showAxesInput.checked = initialSettings.showAxes;
    this.showAxisLabelsInput.checked = initialSettings.showAxisLabels;
    this.showCategoryBandsInput.checked = initialSettings.showCategoryBands;
    this.showRelationshipEdgesInput.checked = initialSettings.showRelationshipEdges;
    this.showTimelineEdgesInput.checked = initialSettings.showTimelineEdges;
    this.highlightLongLivedInput.checked = initialSettings.highlightLongLivedKeywords;
    this.minActiveYearsInput.value = String(initialSettings.minActiveYears);
    this.storyModeInput.checked = initialSettings.storyMode;

    this.updateRangeLabels();

    this.keywordCountInput.addEventListener('input', () => this.updateRangeLabels());
    this.minWeightInput.addEventListener('input', () => this.updateRangeLabels());
    this.minActiveYearsInput.addEventListener('input', () => this.updateRangeLabels());
    this.applyButton.addEventListener('click', () => this.onApply(this.getSettings()));
  }

  private updateRangeLabels(): void {
    this.keywordCountValue.textContent = String(this.keywordCountInput.value);
    this.minWeightValue.textContent = String(this.minWeightInput.value);
    this.minActiveYearsValue.textContent = String(this.minActiveYearsInput.value);
  }

  getSettings(): GraphSettings {
    return {
      year: this.yearSelect.value,
      keywordCount: Number(this.keywordCountInput.value),
      minWeight: Number(this.minWeightInput.value),
      showLabels: this.showLabelsInput.checked,
      showAxes: this.showAxesInput.checked,
      showAxisLabels: this.showAxisLabelsInput.checked,
      showCategoryBands: this.showCategoryBandsInput.checked,
      showRelationshipEdges: this.showRelationshipEdgesInput.checked,
      showTimelineEdges: this.showTimelineEdgesInput.checked,
      highlightLongLivedKeywords: this.highlightLongLivedInput.checked,
      minActiveYears: Number(this.minActiveYearsInput.value),
      storyMode: this.storyModeInput.checked,
    };
  }

  setDisabled(disabled: boolean): void {
    this.yearSelect.disabled = disabled;
    this.keywordCountInput.disabled = disabled;
    this.minWeightInput.disabled = disabled;
    this.showLabelsInput.disabled = disabled;
    this.showAxesInput.disabled = disabled;
    this.showAxisLabelsInput.disabled = disabled;
    this.showCategoryBandsInput.disabled = disabled;
    this.showRelationshipEdgesInput.disabled = disabled;
    this.showTimelineEdgesInput.disabled = disabled;
    this.highlightLongLivedInput.disabled = disabled;
    this.minActiveYearsInput.disabled = disabled;
    this.storyModeInput.disabled = disabled;
    this.applyButton.disabled = disabled;
    this.applyButton.textContent = disabled ? 'Applying...' : 'Apply';
  }
}
