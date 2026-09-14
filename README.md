# umela_cvicenie

Streamlit dashboard nad datasetom [Iris](https://raw.githubusercontent.com/uiuc-cse/data-fa14/gh-pages/data/iris.csv), podľa zadania:

- **Info panel** – počet vyfiltrovaných riadkov, počet všetkých riadkov, počet vybraných druhov
- **Graf** – scatter plot vyfiltrovaných dát (petal_length vs petal_width, farebne podľa species)
- **Filter slidery** – rozsahové slidery pre sepal_length, sepal_width, petal_length, petal_width + výber species
- **Datatable** – tabuľka s vyfiltrovanými dátami

## Spustenie

```bash
pip install -r requirements.txt
streamlit run app.py
```
