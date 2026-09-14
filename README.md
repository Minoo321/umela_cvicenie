# umela_cvicenie

Dashboard nad datasetom [Iris](https://raw.githubusercontent.com/uiuc-cse/data-fa14/gh-pages/data/iris.csv), podľa zadania:

- **Info panel** – počet vyfiltrovaných riadkov, počet všetkých riadkov, počet vybraných druhov
- **Graf** – scatter plot vyfiltrovaných dát (petal_length vs petal_width, farebne podľa species)
- **Filter slidery** – rozsahové slidery pre sepal_length, sepal_width, petal_length, petal_width + výber species
- **Datatable** – tabuľka s vyfiltrovanými dátami

Sú tu dve verzie tej istej dashboard aplikácie:

## 1. Statická single-page stránka (GitHub Pages)

`index.html` + `styles.css` + `app.js` – čistý HTML/CSS/JS bez závislostí a bez servera.
Dataset sa načítava priamo v prehliadači cez `fetch()` z GitHub raw CSV URL.

**Nasadenie na GitHub Pages:**

1. V repozitári choď do **Settings → Pages**.
2. Ako zdroj (Source) vyber branch `main` a priečinok `/ (root)`.
3. Ulož – stránka bude o chvíľu dostupná na `https://<username>.github.io/<repo>/`.

**Lokálne spustenie** (stačí statický server, keďže `fetch` z `file://` nemusí fungovať):

```bash
python3 -m http.server 8000
# otvor http://localhost:8000
```

## 2. Streamlit dashboard (lokálny Python)

`app.py` – rovnaký dashboard postavený na Streamlite, vyžaduje bežiaci Python proces.

```bash
pip install -r requirements.txt
streamlit run app.py
```
