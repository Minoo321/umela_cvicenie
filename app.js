(() => {
  "use strict";

  const DATA_URL = "https://raw.githubusercontent.com/uiuc-cse/data-fa14/gh-pages/data/iris.csv";

  const NUMERIC_FIELDS = [
    { key: "sepal_length", label: "Sepal length", unit: "cm" },
    { key: "sepal_width", label: "Sepal width", unit: "cm" },
    { key: "petal_length", label: "Petal length", unit: "cm" },
    { key: "petal_width", label: "Petal width", unit: "cm" },
  ];

  const state = {
    rows: [],
    species: [],
    ranges: {},
    selectedSpecies: new Set(),
  };

  function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cells = line.split(",");
      const row = {};
      headers.forEach((h, i) => {
        const raw = cells[i];
        row[h] = NUMERIC_FIELDS.some((f) => f.key === h) ? parseFloat(raw) : raw;
      });
      return row;
    });
  }

  function computeRanges(rows) {
    const ranges = {};
    NUMERIC_FIELDS.forEach(({ key }) => {
      const values = rows.map((r) => r[key]);
      ranges[key] = { min: Math.min(...values), max: Math.max(...values) };
    });
    return ranges;
  }

  function filterRows() {
    return state.rows.filter((row) => {
      for (const { key } of NUMERIC_FIELDS) {
        const sel = state.ranges[key];
        if (row[key] < sel.selMin || row[key] > sel.selMax) return false;
      }
      return state.selectedSpecies.has(row.species);
    });
  }

  function fmt(n) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  // ---------- Sliders ----------

  function buildSliders() {
    const container = document.getElementById("sliders");
    container.innerHTML = "";

    NUMERIC_FIELDS.forEach(({ key, label, unit }) => {
      const { min, max } = state.ranges[key];
      state.ranges[key].selMin = min;
      state.ranges[key].selMax = max;

      const wrap = document.createElement("div");
      wrap.className = "slider";
      wrap.innerHTML = `
        <div class="slider-label">
          <span>${label}</span>
          <span class="slider-value"><span class="v-min"></span>–<span class="v-max"></span> ${unit}</span>
        </div>
        <div class="slider-track-wrap">
          <div class="track"></div>
          <div class="range-fill"></div>
          <input type="range" class="range-min" min="${min}" max="${max}" step="0.1" value="${min}">
          <input type="range" class="range-max" min="${min}" max="${max}" step="0.1" value="${max}">
        </div>
      `;
      container.appendChild(wrap);

      const rangeMin = wrap.querySelector(".range-min");
      const rangeMax = wrap.querySelector(".range-max");
      const fill = wrap.querySelector(".range-fill");
      const vMin = wrap.querySelector(".v-min");
      const vMax = wrap.querySelector(".v-max");
      const step = 0.1;

      const paint = () => {
        const lo = parseFloat(rangeMin.value);
        const hi = parseFloat(rangeMax.value);
        const span = max - min || 1;
        fill.style.left = `${((lo - min) / span) * 100}%`;
        fill.style.right = `${100 - ((hi - min) / span) * 100}%`;
        vMin.textContent = fmt(lo);
        vMax.textContent = fmt(hi);
      };

      const onMinInput = () => {
        if (parseFloat(rangeMin.value) > parseFloat(rangeMax.value) - step) {
          rangeMin.value = (parseFloat(rangeMax.value) - step).toFixed(1);
        }
        state.ranges[key].selMin = parseFloat(rangeMin.value);
        paint();
        render();
      };
      const onMaxInput = () => {
        if (parseFloat(rangeMax.value) < parseFloat(rangeMin.value) + step) {
          rangeMax.value = (parseFloat(rangeMin.value) + step).toFixed(1);
        }
        state.ranges[key].selMax = parseFloat(rangeMax.value);
        paint();
        render();
      };

      rangeMin.addEventListener("input", onMinInput);
      rangeMax.addEventListener("input", onMaxInput);

      const bringToFront = (el, other) => {
        el.style.zIndex = 2;
        other.style.zIndex = 1;
      };
      rangeMin.addEventListener("pointerdown", () => bringToFront(rangeMin, rangeMax));
      rangeMax.addEventListener("pointerdown", () => bringToFront(rangeMax, rangeMin));

      wrap._reset = () => {
        rangeMin.value = min;
        rangeMax.value = max;
        state.ranges[key].selMin = min;
        state.ranges[key].selMax = max;
        paint();
      };

      paint();
    });
  }

  function buildSpeciesFilter() {
    const container = document.getElementById("species-options");
    container.innerHTML = "";
    state.species.forEach((sp, i) => {
      const id = `species-${sp}`;
      const label = document.createElement("label");
      label.className = "species-option";
      label.innerHTML = `
        <input type="checkbox" id="${id}" checked>
        <span class="species-swatch" style="background:var(--series-${i + 1})"></span>
        <span></span>
      `;
      label.querySelector("span:last-child").textContent = sp;
      container.appendChild(label);
      const checkbox = label.querySelector("input");
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) state.selectedSpecies.add(sp);
        else state.selectedSpecies.delete(sp);
        render();
      });
    });
  }

  function resetFilters() {
    document.querySelectorAll("#sliders .slider").forEach((el) => el._reset && el._reset());
    document.querySelectorAll("#species-options input[type=checkbox]").forEach((cb) => {
      cb.checked = true;
    });
    state.selectedSpecies = new Set(state.species);
    render();
  }

  // ---------- Chart ----------

  const CHART = { width: 560, height: 360, margin: { top: 16, right: 16, bottom: 44, left: 52 } };

  function niceTicks(min, max, count = 5) {
    const span = max - min || 1;
    const step = span / (count - 1);
    const ticks = [];
    for (let i = 0; i < count; i++) ticks.push(min + step * i);
    return ticks;
  }

  function renderChart(filtered) {
    const svg = document.getElementById("chart");
    const tooltip = document.getElementById("tooltip");
    const emptyState = document.getElementById("chart-empty");
    svg.innerHTML = "";

    if (filtered.length === 0) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    const xField = "petal_length";
    const yField = "petal_width";
    const xRange = state.ranges[xField];
    const yRange = state.ranges[yField];
    const padX = (xRange.max - xRange.min) * 0.08 || 0.5;
    const padY = (yRange.max - yRange.min) * 0.08 || 0.5;
    const xMin = xRange.min - padX;
    const xMax = xRange.max + padX;
    const yMin = yRange.min - padY;
    const yMax = yRange.max + padY;

    const { width, height, margin } = CHART;
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;

    const sx = (v) => margin.left + ((v - xMin) / (xMax - xMin)) * plotW;
    const sy = (v) => margin.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

    const ns = "http://www.w3.org/2000/svg";
    const g = document.createElementNS(ns, "g");

    // gridlines + axis ticks
    niceTicks(yMin, yMax).forEach((t) => {
      const y = sy(t);
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", margin.left);
      line.setAttribute("x2", width - margin.right);
      line.setAttribute("y1", y);
      line.setAttribute("y2", y);
      line.setAttribute("class", "gridline");
      g.appendChild(line);

      const label = document.createElementNS(ns, "text");
      label.setAttribute("x", margin.left - 8);
      label.setAttribute("y", y + 3);
      label.setAttribute("text-anchor", "end");
      label.setAttribute("class", "axis-label");
      label.textContent = t.toFixed(1);
      g.appendChild(label);
    });

    niceTicks(xMin, xMax).forEach((t) => {
      const x = sx(t);
      const label = document.createElementNS(ns, "text");
      label.setAttribute("x", x);
      label.setAttribute("y", height - margin.bottom + 18);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", "axis-label");
      label.textContent = t.toFixed(1);
      g.appendChild(label);
    });

    const baseline = document.createElementNS(ns, "line");
    baseline.setAttribute("x1", margin.left);
    baseline.setAttribute("x2", width - margin.right);
    baseline.setAttribute("y1", margin.top + plotH);
    baseline.setAttribute("y2", margin.top + plotH);
    baseline.setAttribute("class", "baseline");
    g.appendChild(baseline);

    const xTitle = document.createElementNS(ns, "text");
    xTitle.setAttribute("x", margin.left + plotW / 2);
    xTitle.setAttribute("y", height - 6);
    xTitle.setAttribute("text-anchor", "middle");
    xTitle.setAttribute("class", "axis-title");
    xTitle.textContent = "Petal length (cm)";
    g.appendChild(xTitle);

    const yTitle = document.createElementNS(ns, "text");
    yTitle.setAttribute("x", -(margin.top + plotH / 2));
    yTitle.setAttribute("y", 14);
    yTitle.setAttribute("text-anchor", "middle");
    yTitle.setAttribute("class", "axis-title");
    yTitle.setAttribute("transform", "rotate(-90)");
    yTitle.textContent = "Petal width (cm)";
    g.appendChild(yTitle);

    // points
    filtered.forEach((row) => {
      const cx = sx(row[xField]);
      const cy = sy(row[yField]);
      const colorVar = `var(--series-${state.species.indexOf(row.species) + 1})`;

      const hit = document.createElementNS(ns, "circle");
      hit.setAttribute("cx", cx);
      hit.setAttribute("cy", cy);
      hit.setAttribute("r", 12);
      hit.setAttribute("class", "point-hit");

      const dot = document.createElementNS(ns, "circle");
      dot.setAttribute("cx", cx);
      dot.setAttribute("cy", cy);
      dot.setAttribute("r", 5);
      dot.setAttribute("fill", colorVar);
      dot.setAttribute("class", "point-dot");

      const showTooltip = (evt) => {
        tooltip.hidden = false;
        tooltip.innerHTML =
          `<strong>${row.species}</strong><br>` +
          `sepal: ${fmt(row.sepal_length)} × ${fmt(row.sepal_width)}<br>` +
          `petal: ${fmt(row.petal_length)} × ${fmt(row.petal_width)}`;
        const wrapRect = svg.parentElement.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();
        const scale = svgRect.width / width;
        tooltip.style.left = `${cx * scale + (svgRect.left - wrapRect.left)}px`;
        tooltip.style.top = `${cy * scale + (svgRect.top - wrapRect.top)}px`;
      };
      const hideTooltip = () => {
        tooltip.hidden = true;
      };

      hit.addEventListener("pointerenter", showTooltip);
      hit.addEventListener("pointermove", showTooltip);
      hit.addEventListener("pointerleave", hideTooltip);
      hit.addEventListener("focus", showTooltip);
      hit.addEventListener("blur", hideTooltip);
      hit.setAttribute("tabindex", "0");

      g.appendChild(hit);
      g.appendChild(dot);
    });

    svg.appendChild(g);
  }

  function renderLegend() {
    const legend = document.getElementById("legend");
    legend.innerHTML = "";
    state.species.forEach((sp, i) => {
      const item = document.createElement("span");
      item.className = "legend-item";
      item.innerHTML = `<span class="legend-swatch" style="background:var(--series-${i + 1})"></span><span></span>`;
      item.querySelector("span:last-child").textContent = sp;
      legend.appendChild(item);
    });
  }

  // ---------- Table ----------

  function renderTable(filtered) {
    const body = document.getElementById("table-body");
    const frag = document.createDocumentFragment();
    filtered.forEach((row) => {
      const tr = document.createElement("tr");
      NUMERIC_FIELDS.forEach(({ key }) => {
        const td = document.createElement("td");
        td.textContent = fmt(row[key]);
        tr.appendChild(td);
      });
      const speciesTd = document.createElement("td");
      const i = state.species.indexOf(row.species);
      speciesTd.innerHTML = `<span class="species-cell"><span class="species-swatch" style="background:var(--series-${i + 1})"></span><span></span></span>`;
      speciesTd.querySelector("span:last-child").textContent = row.species;
      tr.appendChild(speciesTd);
      frag.appendChild(tr);
    });
    body.innerHTML = "";
    body.appendChild(frag);
  }

  // ---------- Info panel ----------

  function renderInfo(filtered) {
    document.getElementById("info-filtered").textContent = filtered.length;
    document.getElementById("info-total").textContent = state.rows.length;
    document.getElementById("info-species").textContent =
      `${state.selectedSpecies.size} / ${state.species.length}`;
  }

  // ---------- Orchestration ----------

  function render() {
    const filtered = filterRows();
    renderInfo(filtered);
    renderChart(filtered);
    renderTable(filtered);
  }

  async function init() {
    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      state.rows = parseCsv(text);
      state.species = [...new Set(state.rows.map((r) => r.species))].sort();
      state.selectedSpecies = new Set(state.species);
      state.ranges = computeRanges(state.rows);

      buildSliders();
      buildSpeciesFilter();
      renderLegend();
      render();

      document.getElementById("app-main").setAttribute("aria-busy", "false");
      document.getElementById("reset-filters").addEventListener("click", resetFilters);
    } catch (err) {
      document.getElementById("load-error").hidden = false;
      console.error("Failed to load iris dataset:", err);
    }
  }

  init();
})();
