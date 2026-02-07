"""
Database connection and initialization for Companies House data layer.

SQLite Configuration (from ARCHITECTURE_PROPOSAL.md Section 9.1):
- WAL mode for better concurrent read performance
- Foreign keys enabled for referential integrity
- 64MB cache for performance
- NORMAL synchronous for balance of safety/speed
"""

import sqlite3
from pathlib import Path
from typing import Optional

# Default database location
DEFAULT_DB_DIR = Path(__file__).parent.parent.parent / "database"
DEFAULT_DB_PATH = DEFAULT_DB_DIR / "companies_house.db"

# Schema file location
SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def get_connection(
    db_path: Optional[Path] = None,
    read_only: bool = False
) -> sqlite3.Connection:
    """
    Get a configured SQLite connection.

    Args:
        db_path: Path to database file. Defaults to database/companies_house.db
        read_only: If True, open in read-only mode (useful for queries)

    Returns:
        Configured sqlite3.Connection with PRAGMA settings applied

    Example:
        conn = get_connection()
        cursor = conn.execute("SELECT * FROM companies WHERE company_number = ?", ("12345678",))
    """
    if db_path is None:
        db_path = DEFAULT_DB_PATH

    # Ensure parent directory exists
    db_path.parent.mkdir(parents=True, exist_ok=True)

    # Build connection URI
    if read_only:
        uri = f"file:{db_path}?mode=ro"
        conn = sqlite3.connect(uri, uri=True)
    else:
        conn = sqlite3.connect(db_path)

    # Apply PRAGMA settings for optimal performance
    _configure_connection(conn)

    return conn


def _configure_connection(conn: sqlite3.Connection) -> None:
    """
    Apply SQLite PRAGMA settings for optimal performance.

    Settings from ARCHITECTURE_PROPOSAL.md Section 9.1:
    - WAL mode: Better concurrent read performance
    - synchronous NORMAL: Good balance of safety and speed
    - cache_size -64000: 64MB cache (negative = KB)
    - foreign_keys ON: Enforce referential integrity
    """
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA cache_size = -64000")  # 64MB (negative value = KB)
    conn.execute("PRAGMA foreign_keys = ON")

    # Additional performance settings
    conn.execute("PRAGMA temp_store = MEMORY")  # Keep temp tables in memory
    conn.execute("PRAGMA mmap_size = 268435456")  # 256MB memory-mapped I/O

    # Return rows as Row objects for dict-like access
    conn.row_factory = sqlite3.Row


def init_db(db_path: Optional[Path] = None, force: bool = False) -> Path:
    """
    Initialize the database with the schema.

    Creates all tables, indexes, and initial schema version record.
    Safe to call multiple times - uses IF NOT EXISTS.

    Args:
        db_path: Path to database file. Defaults to database/companies_house.db
        force: If True, delete existing database and recreate

    Returns:
        Path to the initialized database file

    Raises:
        FileNotFoundError: If schema.sql cannot be found

    Example:
        # Initialize with defaults
        db_path = init_db()

        # Initialize at custom location
        db_path = init_db(Path("./test.db"))

        # Force recreation (deletes existing data!)
        db_path = init_db(force=True)
    """
    if db_path is None:
        db_path = DEFAULT_DB_PATH

    # Handle force recreation
    if force and db_path.exists():
        db_path.unlink()
        # Also remove WAL and SHM files if they exist
        wal_path = db_path.with_suffix(".db-wal")
        shm_path = db_path.with_suffix(".db-shm")
        if wal_path.exists():
            wal_path.unlink()
        if shm_path.exists():
            shm_path.unlink()

    # Verify schema file exists
    if not SCHEMA_PATH.exists():
        raise FileNotFoundError(f"Schema file not found: {SCHEMA_PATH}")

    # Read schema SQL
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")

    # Create connection and execute schema
    conn = get_connection(db_path)
    try:
        conn.executescript(schema_sql)
        conn.commit()
    finally:
        conn.close()

    return db_path


def get_schema_version(conn: sqlite3.Connection) -> Optional[int]:
    """
    Get the current schema version from the database.

    Args:
        conn: Active database connection

    Returns:
        Current schema version number, or None if table doesn't exist
    """
    try:
        cursor = conn.execute(
            "SELECT MAX(version) FROM schema_version"
        )
        row = cursor.fetchone()
        return row[0] if row else None
    except sqlite3.OperationalError:
        # Table doesn't exist
        return None


def verify_schema(conn: sqlite3.Connection) -> dict:
    """
    Verify the database schema is correctly initialized.

    Returns a dict with:
    - version: Current schema version
    - tables: List of table names
    - indexes: List of index names
    - valid: True if all expected tables exist

    Args:
        conn: Active database connection

    Returns:
        Dict with schema verification results
    """
    expected_tables = {
        "schema_version",
        "batches",
        "companies",
        "filings",
        "concepts",
        "dimension_patterns",
        "context_definitions",
        "numeric_facts",
        "text_facts",
    }

    # Get actual tables
    cursor = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )
    actual_tables = {row[0] for row in cursor.fetchall()}

    # Get indexes
    cursor = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"
    )
    indexes = [row[0] for row in cursor.fetchall()]

    # Get schema version
    version = get_schema_version(conn)

    return {
        "version": version,
        "tables": sorted(actual_tables),
        "indexes": sorted(indexes),
        "valid": expected_tables.issubset(actual_tables),
        "missing_tables": sorted(expected_tables - actual_tables)
    }


# Convenience function for context manager usage
class DatabaseConnection:
    """
    Context manager for database connections.

    Example:
        with DatabaseConnection() as conn:
            conn.execute("SELECT * FROM companies")
    """

    def __init__(self, db_path: Optional[Path] = None, read_only: bool = False):
        self.db_path = db_path
        self.read_only = read_only
        self.conn: Optional[sqlite3.Connection] = None

    def __enter__(self) -> sqlite3.Connection:
        self.conn = get_connection(self.db_path, self.read_only)
        return self.conn

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        if self.conn:
            if exc_type is None:
                self.conn.commit()
            self.conn.close()


if __name__ == "__main__":
    # Quick test when run directly
    import sys

    print("Initializing Companies House database...")
    db_path = init_db()
    print(f"Database created at: {db_path}")

    with DatabaseConnection() as conn:
        result = verify_schema(conn)
        print(f"\nSchema version: {result['version']}")
        print(f"Tables: {', '.join(result['tables'])}")
        print(f"Indexes: {len(result['indexes'])} created")
        print(f"Schema valid: {result['valid']}")

        if result['missing_tables']:
            print(f"Missing tables: {result['missing_tables']}")
            sys.exit(1)

    print("\nDatabase initialization complete!")
