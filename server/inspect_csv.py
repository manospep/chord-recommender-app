import pandas as pd

df = pd.read_csv('/Users/manospepanides/Desktop/chords app/data/chords_and_lyrics.csv')

print(df.columns)
print(df.head(20))
print(df["chords"])
