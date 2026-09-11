#!/usr/bin/env python3
"""Build a small, real-wiring MaleCNS v1.0 artifact.

The default neuPrint path requires NEUPRINT_TOKEN. The public snapshot can be
queried without a token only with --allow-public-neuprint, which is recorded in
provenance. No synthetic IDs, nodes, edges, or weights are generated.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from scipy import sparse

DATASET = "male-cns:v1.0"
SERVER = "https://neuprint.janelia.org"
INPUT_SUPERCLASSES = ("vnc_sensory", "sensory_ascending")
ASCENDING_SUPERCLASS = "ascending_neuron"
INTERMEDIATE_SUPERCLASS = "cb_intrinsic"
OUTPUT_SUPERCLASS = "descending_neuron"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).parents[1] / "data" / "generated",
    )
    parser.add_argument("--min-weight", type=int, default=5)
    parser.add_argument("--input-limit", type=int, default=48)
    parser.add_argument("--ascending-limit", type=int, default=64)
    parser.add_argument("--intermediate-limit", type=int, default=96)
    parser.add_argument("--output-limit", type=int, default=48)
    parser.add_argument(
        "--allow-public-neuprint",
        action="store_true",
        help="Use the anonymous public v1.0 snapshot when no token is supplied.",
    )
    return parser.parse_args()


class NeuPrintQuery:
    def __init__(self, allow_public: bool) -> None:
        self.token = os.getenv("NEUPRINT_TOKEN", "").strip()
        self.client: Any | None = None
        if not self.token and not allow_public:
            raise RuntimeError(
                "NEUPRINT_TOKEN is required. Use --allow-public-neuprint only "
                "for the anonymous official public snapshot."
            )
        if self.token:
            from neuprint import Client

            self.client = Client(SERVER, dataset=DATASET, token=self.token)
            self.access_mode = "neuprint-python-token"
        else:
            self.access_mode = "anonymous-public-snapshot"

    def fetch(self, cypher: str) -> pd.DataFrame:
        if self.client is not None:
            return self.client.fetch_custom(cypher)
        payload = json.dumps({"dataset": DATASET, "cypher": cypher}).encode()
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        request = urllib.request.Request(
            f"{SERVER}/api/custom/custom",
            payload,
            headers,
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=180) as response:
            result = json.load(response)
        return pd.DataFrame(result["data"], columns=result["columns"])


def id_list(values: set[int] | list[int]) -> str:
    return "[" + ",".join(str(int(value)) for value in sorted(values)) + "]"


def fetch_layer(
    query: NeuPrintQuery,
    source_filter: str,
    target_superclass: str,
    min_weight: int,
    limit: int,
) -> pd.DataFrame:
    return query.fetch(
        f"""
        MATCH (source:Neuron)-[edge:ConnectsTo]->(target:Neuron)
        WHERE source.status = 'Traced'
          AND target.status = 'Traced'
          AND {source_filter}
          AND target.superclass = '{target_superclass}'
          AND edge.weight >= {min_weight}
        RETURN source.bodyId AS body_pre,
               target.bodyId AS body_post,
               edge.weight AS weight
        ORDER BY edge.weight DESC, source.bodyId, target.bodyId
        LIMIT {limit}
        """
    )


def cap_ids(edges: pd.DataFrame, column: str, limit: int) -> set[int]:
    totals = edges.groupby(column, as_index=False)["weight"].sum()
    totals = totals.sort_values(["weight", column], ascending=[False, True])
    return {int(value) for value in totals[column].head(limit)}


def discover_connected_populations(
    query: NeuPrintQuery, args: argparse.Namespace
) -> tuple[set[int], set[int], set[int], set[int]]:
    first = fetch_layer(
        query,
        f"source.superclass IN {list(INPUT_SUPERCLASSES)!r}",
        ASCENDING_SUPERCLASS,
        args.min_weight,
        8_000,
    )
    input_ids = cap_ids(first, "body_pre", args.input_limit)
    ascending_ids = cap_ids(
        first[first["body_pre"].isin(input_ids)],
        "body_post",
        args.ascending_limit,
    )

    second = fetch_layer(
        query,
        f"source.bodyId IN {id_list(ascending_ids)}",
        INTERMEDIATE_SUPERCLASS,
        args.min_weight,
        12_000,
    )
    intermediate_ids = cap_ids(second, "body_post", args.intermediate_limit)

    third = fetch_layer(
        query,
        f"source.bodyId IN {id_list(intermediate_ids)}",
        OUTPUT_SUPERCLASS,
        args.min_weight,
        12_000,
    )
    output_ids = cap_ids(third, "body_post", args.output_limit)

    # Remove capped nodes that do not participate in a complete retained path.
    intermediate_ids &= {
        int(value)
        for value in third.loc[
            third["body_post"].isin(output_ids), "body_pre"
        ].unique()
    }
    ascending_ids &= {
        int(value)
        for value in second.loc[
            second["body_post"].isin(intermediate_ids), "body_pre"
        ].unique()
    }
    input_ids &= {
        int(value)
        for value in first.loc[
            first["body_post"].isin(ascending_ids), "body_pre"
        ].unique()
    }

    if not all((input_ids, ascending_ids, intermediate_ids, output_ids)):
        raise RuntimeError("The selected filters did not produce a complete path.")
    return input_ids, ascending_ids, intermediate_ids, output_ids


def fetch_annotations(query: NeuPrintQuery, neuron_ids: set[int]) -> pd.DataFrame:
    return query.fetch(
        f"""
        MATCH (neuron:Neuron)
        WHERE neuron.bodyId IN {id_list(neuron_ids)}
        RETURN neuron.bodyId AS bodyId,
               neuron.type AS type,
               neuron.instance AS instance,
               neuron.superclass AS superclass,
               neuron.class AS class,
               neuron.subclass AS subclass,
               neuron.status AS status,
               neuron.predictedNt AS predictedNt
        ORDER BY neuron.bodyId
        """
    )


def fetch_induced_edges(
    query: NeuPrintQuery, neuron_ids: set[int]
) -> pd.DataFrame:
    ids = id_list(neuron_ids)
    return query.fetch(
        f"""
        MATCH (source:Neuron)-[edge:ConnectsTo]->(target:Neuron)
        WHERE source.bodyId IN {ids}
          AND target.bodyId IN {ids}
          AND edge.weight > 0
        RETURN source.bodyId AS body_pre,
               target.bodyId AS body_post,
               edge.weight AS weight
        ORDER BY source.bodyId, target.bodyId
        """
    )


def digest_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_selection_doc(
    path: Path,
    neurons: pd.DataFrame,
    groups: dict[str, set[int]],
    query_description: str,
) -> None:
    lines = [
        "# MaleCNS Subgraph Selection",
        "",
        "Generated from the official `male-cns:v1.0` neuPrint snapshot. "
        "Every listed body ID was returned by the source query.",
        "",
        f"Source query strategy: {query_description}",
        "",
        "Source query pattern (executed with concrete verified IDs at each layer):",
        "",
        "```cypher",
        "MATCH (source:Neuron)-[edge:ConnectsTo]->(target:Neuron)",
        "WHERE source.status = 'Traced' AND target.status = 'Traced'",
        "  AND source.superclass IN $verifiedSourceSuperclasses",
        "  AND target.superclass = $verifiedTargetSuperclass",
        "  AND edge.weight >= $minimumPathWeight",
        "RETURN source.bodyId, target.bodyId, edge.weight",
        "ORDER BY edge.weight DESC",
        "```",
        "",
    ]
    for role, ids in groups.items():
        rows = neurons[neurons["bodyId"].isin(ids)]
        superclasses = ", ".join(sorted(rows["superclass"].dropna().unique()))
        lines.extend(
            [
                f"## {role}",
                "",
                f"- Number of neurons: {len(rows)}",
                f"- Actual superclass annotation: `{superclasses}`",
                f"- Actual body IDs: {', '.join(map(str, sorted(ids)))}",
                "- Limitation: population role and market-channel assignment "
                "are experimental project abstractions.",
                "",
            ]
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    args = parse_args()
    if args.min_weight < 1:
        raise ValueError("--min-weight must be positive")
    query = NeuPrintQuery(args.allow_public_neuprint)

    schema = query.fetch(
        """
        MATCH (neuron:Neuron)
        WHERE neuron.superclass IS NOT NULL
        RETURN DISTINCT neuron.superclass AS superclass
        ORDER BY superclass
        """
    )
    available = set(schema["superclass"].dropna())
    required = {
        *INPUT_SUPERCLASSES,
        ASCENDING_SUPERCLASS,
        INTERMEDIATE_SUPERCLASS,
        OUTPUT_SUPERCLASS,
    }
    missing = required - available
    if missing:
        raise RuntimeError(f"Official annotation values are missing: {sorted(missing)}")

    input_ids, ascending_ids, intermediate_ids, output_ids = (
        discover_connected_populations(query, args)
    )
    groups = {
        "sensory-input": input_ids,
        "ascending": ascending_ids,
        "path-intermediate": intermediate_ids,
        "descending-output": output_ids,
    }
    all_ids = set().union(*groups.values())
    neurons = fetch_annotations(query, all_ids)
    if set(map(int, neurons["bodyId"])) != all_ids:
        raise RuntimeError("neuPrint did not return every selected real neuron.")
    neurons["role"] = neurons["bodyId"].map(
        {
            body_id: role
            for role, values in groups.items()
            for body_id in values
        }
    )

    edges = fetch_induced_edges(query, all_ids)
    if edges.empty:
        raise RuntimeError("Official induced subgraph contains no edges.")
    edge_endpoints = set(map(int, edges["body_pre"])) | set(
        map(int, edges["body_post"])
    )
    if not edge_endpoints <= all_ids:
        raise RuntimeError("An edge endpoint is absent from the neuron table.")

    neuron_ids = np.array(sorted(all_ids), dtype=np.int64)
    id_to_index = {int(body_id): index for index, body_id in enumerate(neuron_ids)}
    source_indices = edges["body_pre"].map(id_to_index).to_numpy(np.int64)
    target_indices = edges["body_post"].map(id_to_index).to_numpy(np.int64)
    raw_weights = edges["weight"].to_numpy(np.int64)
    adjacency = sparse.csr_matrix(
        (raw_weights, (target_indices, source_indices)),
        shape=(len(neuron_ids), len(neuron_ids)),
        dtype=np.float64,
    )

    args.output_dir.mkdir(parents=True, exist_ok=True)
    npz_path = args.output_dir / "malecns-v1-subgraph.npz"
    neurons_path = args.output_dir / "malecns-v1-neurons.parquet"
    provenance_path = args.output_dir / "malecns-v1-provenance.json"
    np.savez_compressed(
        npz_path,
        neuron_ids=neuron_ids,
        adjacency_data=adjacency.data,
        adjacency_indices=adjacency.indices,
        adjacency_indptr=adjacency.indptr,
        adjacency_shape=np.array(adjacency.shape, dtype=np.int64),
        source_indices=source_indices,
        target_indices=target_indices,
        raw_weights=raw_weights,
        input_indices=np.array(
            sorted(id_to_index[value] for value in input_ids), dtype=np.int64
        ),
        output_indices=np.array(
            sorted(id_to_index[value] for value in output_ids), dtype=np.int64
        ),
    )
    neurons.to_parquet(neurons_path, index=False)

    component_hashes = {
        "malecns-v1-subgraph.npz": digest_file(npz_path),
        "malecns-v1-neurons.parquet": digest_file(neurons_path),
    }
    digest_manifest = "".join(
        f"{name}:{value}\n" for name, value in sorted(component_hashes.items())
    )
    bundle_sha256 = hashlib.sha256(
        digest_manifest.encode()
    ).hexdigest()
    query_description = (
        "Traced vnc_sensory|sensory_ascending -> ascending_neuron -> "
        "cb_intrinsic -> descending_neuron; top weighted populations capped "
        f"at {args.input_limit}/{args.ascending_limit}/"
        f"{args.intermediate_limit}/{args.output_limit}; retained induced edges."
    )
    provenance: dict[str, Any] = {
        "source": "HHMI Janelia MaleCNS",
        "sourceUrl": "https://male-cns.janelia.org/download/",
        "server": SERVER,
        "dataset": DATASET,
        "license": "CC-BY",
        "generatedAt": datetime.now(UTC).isoformat(),
        "accessMode": query.access_mode,
        "neuronCount": len(neuron_ids),
        "edgeCount": int(len(edges)),
        "sourceNeuronIds": sorted(input_ids),
        "outputNeuronIds": sorted(output_ids),
        "weightMin": int(raw_weights.min()),
        "weightMax": int(raw_weights.max()),
        "queryDescription": query_description,
        "extractionParameters": {
            "minimumPathWeight": args.min_weight,
            "inputLimit": args.input_limit,
            "ascendingLimit": args.ascending_limit,
            "intermediateLimit": args.intermediate_limit,
            "outputLimit": args.output_limit,
        },
        "componentSha256": component_hashes,
        "sha256": bundle_sha256,
    }
    provenance_path.write_text(
        json.dumps(provenance, indent=2) + "\n", encoding="utf-8"
    )
    write_selection_doc(
        Path(__file__).parents[3] / "docs" / "MALECNS_SELECTION.md",
        neurons,
        groups,
        query_description,
    )

    print(f"MaleCNS dataset: {DATASET}")
    print(f"Real neurons loaded: {len(neuron_ids)}")
    print(f"Real edges loaded: {len(edges)}")
    print("Example real edges:")
    for edge in edges.head(5).itertuples(index=False):
        print(f"{edge.body_pre} -> {edge.body_post} weight={edge.weight}")
    print(f"Source IDs: {sorted(input_ids)}")
    print(f"Output IDs: {sorted(output_ids)}")
    print(f"Artifact SHA-256: {bundle_sha256}")


if __name__ == "__main__":
    main()
