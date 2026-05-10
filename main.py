"""Main entry point for idalista-tracker."""

import logging
import sys

from idalista_tracker.config import ServerCfg
from idalista_tracker.logging import configure_logging


def main():
    """Run the idalista-tracker application."""
    # Configure logging first
    configure_logging()
    logger = logging.getLogger(__name__)

    # Load server configuration
    try:
        server_cfg = ServerCfg()
    except Exception as e:
        logger.error(f"Failed to load server configuration: {e}")
        sys.exit(1)

    logger.info(f"Starting idalista-tracker on {server_cfg.host}:{server_cfg.port}")
    logger.debug(f"Configuration: host={server_cfg.host}, port={server_cfg.port}, "
                 f"reload={server_cfg.reload}, workers={server_cfg.workers}")

    # TODO: Initialize FastAPI application here
    # For now, just log that we're ready
    logger.info("Application initialized successfully")

    return 0


if __name__ == "__main__":
    sys.exit(main())
