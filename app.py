import pandas as pd
import plotly.express as px
import streamlit as st

DATA_URL = "https://raw.githubusercontent.com/uiuc-cse/data-fa14/gh-pages/data/iris.csv"
NUMERIC_COLUMNS = ["sepal_length", "sepal_width", "petal_length", "petal_width"]

st.set_page_config(page_title="Iris Explorer", layout="wide")


@st.cache_data
def load_data() -> pd.DataFrame:
    return pd.read_csv(DATA_URL)


def filter_data(df: pd.DataFrame, ranges: dict, species: list[str]) -> pd.DataFrame:
    mask = pd.Series(True, index=df.index)
    for column, (low, high) in ranges.items():
        mask &= df[column].between(low, high)
    if species:
        mask &= df["species"].isin(species)
    return df[mask]


df = load_data()

st.title("Iris Explorer")

top_left, top_right = st.columns([1, 2])

with top_left:
    st.subheader("Info panel")
    info_placeholder = st.container()

with top_right:
    st.subheader("Filtered data as graph")
    graph_placeholder = st.empty()

st.subheader("Filter sliders")
species_options = sorted(df["species"].unique())
slider_cols = st.columns(len(NUMERIC_COLUMNS))
ranges = {}
for col, name in zip(slider_cols, NUMERIC_COLUMNS):
    col_min, col_max = float(df[name].min()), float(df[name].max())
    with col:
        ranges[name] = st.slider(
            name.replace("_", " ").title(),
            min_value=col_min,
            max_value=col_max,
            value=(col_min, col_max),
        )
selected_species = st.multiselect("Species", species_options, default=species_options)

filtered_df = filter_data(df, ranges, selected_species)

with info_placeholder:
    st.metric("Filtered rows", len(filtered_df))
    st.metric("Total rows", len(df))
    st.metric("Species selected", len(selected_species))

with graph_placeholder:
    if filtered_df.empty:
        st.info("No data matches the current filters.")
    else:
        fig = px.scatter(
            filtered_df,
            x="petal_length",
            y="petal_width",
            color="species",
            hover_data=NUMERIC_COLUMNS,
        )
        st.plotly_chart(fig, use_container_width=True)

st.subheader("Datatable (filtered data)")
st.dataframe(filtered_df, use_container_width=True)
