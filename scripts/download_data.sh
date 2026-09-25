#!/usr/bin/env bash
# Download the FlyWire connectome (Shiu et al. 2024 model inputs) and neuron annotations into ./data
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p data && cd data

MODEL=https://raw.githubusercontent.com/philshiu/Drosophila_brain_model/main
ANNOT=https://raw.githubusercontent.com/flyconnectome/flywire_annotations/main/supplemental_files

curl -fLO "$MODEL/2023_03_23_completeness_630_final.csv"
curl -fLO "$MODEL/2023_03_23_connectivity_630_final.parquet"
curl -fLO "$ANNOT/Supplemental_file1_neuron_annotations.tsv"
ls -lh
