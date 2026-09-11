"""Verified loading of the versioned MaleCNS-derived sparse artifact."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import sparse

DATASET = "male-cns:v1.0"


class ConnectomeArtifactError(RuntimeError):
    """Raised when a real-connectome artifact cannot be trusted."""


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


@dataclass(frozen=True)
class MaleCNSGraph:
    neuron_ids: np.ndarray
    id_to_index: dict[int, int]
    adjacency: sparse.csr_matrix
    source_indices: np.ndarray
    target_indices: np.ndarray
    raw_weights: np.ndarray
    neurons: pd.DataFrame
    input_indices: np.ndarray
    output_indices: np.ndarray
    provenance: dict[str, object]

    @property
    def edge_count(self) -> int:
        return int(len(self.raw_weights))

    @classmethod
    def load(cls, data_dir: Path) -> MaleCNSGraph:
        npz_path = data_dir / "malecns-v1-subgraph.npz"
        neurons_path = data_dir / "malecns-v1-neurons.parquet"
        provenance_path = data_dir / "malecns-v1-provenance.json"
        missing = [
            str(path)
            for path in (npz_path, neurons_path, provenance_path)
            if not path.is_file()
        ]
        if missing:
            raise ConnectomeArtifactError(
                f"MaleCNS artifact missing: {', '.join(missing)}"
            )

        provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
        if provenance.get("dataset") != DATASET:
            raise ConnectomeArtifactError("Unexpected connectome dataset.")
        component_hashes = provenance.get("componentSha256")
        if not isinstance(component_hashes, dict):
            raise ConnectomeArtifactError("Missing component checksums.")
        for path in (npz_path, neurons_path):
            if component_hashes.get(path.name) != _sha256(path):
                raise ConnectomeArtifactError(f"Checksum mismatch: {path.name}")

        expected_bundle = hashlib.sha256(
            "".join(
                f"{name}:{value}\n"
                for name, value in sorted(component_hashes.items())
            ).encode()
        ).hexdigest()
        if provenance.get("sha256") != expected_bundle:
            raise ConnectomeArtifactError("Artifact bundle checksum mismatch.")

        archive = np.load(npz_path, allow_pickle=False)
        neuron_ids = archive["neuron_ids"].astype(np.int64)
        shape = tuple(int(value) for value in archive["adjacency_shape"])
        if shape != (len(neuron_ids), len(neuron_ids)):
            raise ConnectomeArtifactError("Adjacency shape is inconsistent.")
        if len(set(map(int, neuron_ids))) != len(neuron_ids):
            raise ConnectomeArtifactError("Neuron IDs are not unique.")

        adjacency = sparse.csr_matrix(
            (
                archive["adjacency_data"].astype(np.float64),
                archive["adjacency_indices"].astype(np.int32),
                archive["adjacency_indptr"].astype(np.int32),
            ),
            shape=shape,
        )
        source_indices = archive["source_indices"].astype(np.int64)
        target_indices = archive["target_indices"].astype(np.int64)
        raw_weights = archive["raw_weights"].astype(np.int64)
        if not (
            len(source_indices) == len(target_indices) == len(raw_weights) > 0
        ):
            raise ConnectomeArtifactError("Raw edge arrays are inconsistent.")
        if (
            source_indices.min() < 0
            or target_indices.min() < 0
            or source_indices.max() >= len(neuron_ids)
            or target_indices.max() >= len(neuron_ids)
        ):
            raise ConnectomeArtifactError("Edge endpoint index is invalid.")
        extracted = np.asarray(
            adjacency[target_indices, source_indices]
        ).reshape(-1)
        if not np.array_equal(extracted.astype(np.int64), raw_weights):
            raise ConnectomeArtifactError(
                "CSR entries do not match extracted raw weights."
            )

        neurons = pd.read_parquet(neurons_path)
        if set(map(int, neurons["bodyId"])) != set(map(int, neuron_ids)):
            raise ConnectomeArtifactError(
                "Neuron table does not match adjacency body IDs."
            )
        if int(provenance.get("neuronCount", -1)) != len(neuron_ids):
            raise ConnectomeArtifactError("Provenance neuron count mismatch.")
        if int(provenance.get("edgeCount", -1)) != len(raw_weights):
            raise ConnectomeArtifactError("Provenance edge count mismatch.")

        input_indices = archive["input_indices"].astype(np.int64)
        output_indices = archive["output_indices"].astype(np.int64)
        if len(input_indices) == 0 or len(output_indices) == 0:
            raise ConnectomeArtifactError("Input or output population is empty.")

        return cls(
            neuron_ids=neuron_ids,
            id_to_index={
                int(body_id): index for index, body_id in enumerate(neuron_ids)
            },
            adjacency=adjacency,
            source_indices=source_indices,
            target_indices=target_indices,
            raw_weights=raw_weights,
            neurons=neurons,
            input_indices=input_indices,
            output_indices=output_indices,
            provenance=provenance,
        )

    def modeled_matrix(
        self, mode: str, shuffle_seed: int = 20260911
    ) -> sparse.csr_matrix:
        targets = self.target_indices.copy()
        if mode == "shuffled-control":
            rng = np.random.default_rng(shuffle_seed)
            targets = rng.permutation(targets)
        elif mode != "real-connectome":
            raise ValueError(f"Unsupported simulation mode: {mode}")

        transmitter_by_id = self.neurons.set_index("bodyId")[
            "predictedNt"
        ].to_dict()
        signs = np.ones(len(self.neuron_ids), dtype=np.float64)
        # Modeled assumptions, not biological facts.
        inhibitory = {"gaba", "glutamate", "histamine"}
        for index, body_id in enumerate(self.neuron_ids):
            predicted = str(transmitter_by_id.get(int(body_id), "")).lower()
            if predicted in inhibitory:
                signs[index] = -1.0

        signed_weights = self.raw_weights.astype(np.float64) * signs[
            self.source_indices
        ]
        matrix = sparse.csr_matrix(
            (signed_weights, (targets, self.source_indices)),
            shape=self.adjacency.shape,
        )
        incoming = np.asarray(abs(matrix).sum(axis=1)).reshape(-1)
        scale = np.maximum(incoming, 1.0)
        return sparse.diags(1.0 / scale) @ matrix
