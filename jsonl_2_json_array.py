#!/usr/bin/env python3
input_file = "./data/signal-mongodb-07ago2025-userGDZ.json"
output_file = "./data/07ago2025.json"

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