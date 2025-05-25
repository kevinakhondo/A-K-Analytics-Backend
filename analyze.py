import pandas as pd
import sys

if len(sys.argv) != 2:
    print("Usage: python analyze.py <filename>")
    sys.exit(1)

filename = sys.argv[1]
df = pd.read_csv(filename)  # Adjust for XLSX if needed
# Perform ETL/EDA (e.g., clean data, generate report)
df.to_csv(f"{filename}.processed.csv", index=False)
print(f"Processed {filename} and saved as {filename}.processed.csv")