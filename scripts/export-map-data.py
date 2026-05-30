#!/usr/bin/env python3
import argparse
import csv
import json
import pathlib
import urllib.request


def get_json(url: str):
    with urllib.request.urlopen(url) as response:
        return json.load(response)


def write_csv(path: pathlib.Path, rows, fieldnames):
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def main():
    parser = argparse.ArgumentParser(description="Exporta circuitos y escuelas desde /api/map/dataset")
    parser.add_argument("--api-url", default="http://localhost:3001/api")
    parser.add_argument("--campaign-id", required=True)
    parser.add_argument("--out-dir", default="exports")
    args = parser.parse_args()

    out_dir = pathlib.Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    dataset = get_json(f"{args.api_url}/map/dataset?campaignId={args.campaign_id}")

    (out_dir / "map-dataset.json").write_text(json.dumps(dataset, ensure_ascii=False, indent=2), encoding="utf-8")

    circuits = dataset.get("circuits", [])
    schools = dataset.get("schools", [])

    write_csv(
        out_dir / "circuits.csv",
        circuits,
        [
            "id",
            "codigo",
            "nombre",
            "zona",
            "electoresNacionales",
            "electoresExtranjeros",
            "cantidadEscuelas",
            "cantidadMesas",
            "polygon",
        ],
    )
    write_csv(
        out_dir / "schools.csv",
        [
            {
                "id": s.get("id"),
                "nombre": s.get("nombre"),
                "direccion": s.get("direccion"),
                "circuitoCodigo": s.get("circuitoCodigo"),
                "lat": s.get("lat"),
                "lng": s.get("lng"),
                "coverageEstado": (s.get("coverage") or {}).get("estado"),
                "coverageCriticas": (s.get("coverage") or {}).get("criticas"),
                "coverageParciales": (s.get("coverage") or {}).get("parciales"),
                "coverageOptimas": (s.get("coverage") or {}).get("optimas"),
            }
            for s in schools
        ],
        [
            "id",
            "nombre",
            "direccion",
            "circuitoCodigo",
            "lat",
            "lng",
            "coverageEstado",
            "coverageCriticas",
            "coverageParciales",
            "coverageOptimas",
        ],
    )

    print(f"Export OK -> {out_dir.resolve()}")
    print(f"circuits={len(circuits)} schools={len(schools)}")


if __name__ == "__main__":
    main()
