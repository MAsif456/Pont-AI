"""Shared infrastructure: LLM, embeddings, vector store and data loading.

Named ``core`` rather than ``services`` to avoid confusion with the Cardiff care
*services* directory and the ``search_services`` tool.
"""

# Installed here because importing this package is the single chokepoint before
# ChromaDB (via core.vector_store) is ever imported. See grpc_compat for why.
from .grpc_compat import install_grpc_stub

install_grpc_stub()
