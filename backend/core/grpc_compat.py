"""Workaround for Windows Application Control blocking gRPC's ``cygrpc`` DLL.

ChromaDB imports OpenTelemetry's OTLP **gRPC** trace exporter unconditionally,
which pulls in ``grpc`` and its native ``cygrpc`` extension. On this machine
Smart App Control blocks that DLL, which would crash any process that imports
ChromaDB. Pont never uses gRPC (it uses a local persistent Chroma store and its
own embeddings, and never enables OpenTelemetry tracing), so we register a stub
``grpc`` module before ChromaDB is imported. The stub satisfies the import-time
references; because tracing is never enabled, none of it is ever exercised.

If gRPC is ever genuinely needed, delete this shim and stop importing it.
"""

import sys
import warnings
from types import ModuleType
from unittest.mock import MagicMock

# Submodules OpenTelemetry's exporter may import from the grpc namespace.
_GRPC_SUBMODULES = ("grpc", "grpc.aio", "grpc.experimental", "grpc._cython")


class _StubModule(ModuleType):
    """A module that returns a harmless mock for any attribute access."""

    def __getattr__(self, name: str):  # pragma: no cover - trivial passthrough
        # Report a plausible version so libraries that check grpc.__version__
        # (e.g. OpenTelemetry's generated code) don't emit spurious warnings.
        if name == "__version__":
            return "1.99.0"
        return MagicMock(name=f"grpc_stub.{name}")


def install_grpc_stub() -> None:
    """Register stub grpc modules in ``sys.modules`` if grpc cannot load.

    Real grpc is preferred when it imports cleanly; the stub is only installed
    when importing it fails (e.g. the DLL is blocked), so normal environments are
    unaffected.
    """
    if "grpc" in sys.modules:
        return
    try:
        import grpc  # noqa: F401

        return
    except Exception:
        # grpc is unavailable on this machine; fall back to stubs.
        for name in _GRPC_SUBMODULES:
            sys.modules[name] = _StubModule(name)
        # OpenTelemetry's generated code logs a version-mismatch warning against
        # the stub; silence it since the gRPC path is never exercised.
        warnings.filterwarnings(
            "ignore", message="The grpc package installed is at version"
        )
