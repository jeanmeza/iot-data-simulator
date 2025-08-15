#!/usr/bin/env python3
"""
This script reads a JSON Lines file and converts it into a JSON array format.
The file does not necessarily have the `jsonl` extension, but it is structured as JSON Lines.
"""

input_file = "./data/comftech-03ago2023-samples.json"
output_file = "./data/03ago2025.json"

def main():
    print("Start")
    with open(input_file, "r", encoding="utf-8") as fin, open(output_file, "w", encoding="utf-8") as fout:
        fout.write("[\n")
        first = True
        for line in fin:
            line = line.rstrip('\n')
            if not line.strip():
                continue  # skip empty lines
            if not first:
                fout.write(",\n")
            fout.write(line)
            first = False
        fout.write("\n]\n")
    print("End")
        
if __name__ == "__main__":
    main()