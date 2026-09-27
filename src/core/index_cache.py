import logging
import sqlite3
import threading
from contextlib import closing
from pathlib import Path

logger = logging.getLogger("osu_sync.index_cache")


class SongIndexStore:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._schema_ready = False
        self._schema_lock = threading.Lock()

    def _connect(self) -> sqlite3.Connection:
        if self._schema_ready:
            return sqlite3.connect(self.path)
        with self._schema_lock:
            if self._schema_ready:
                return sqlite3.connect(self.path)
            self.path.parent.mkdir(parents=True, exist_ok=True)
            connection = sqlite3.connect(self.path)
            try:
                connection.execute(
                    "CREATE TABLE IF NOT EXISTS source "
                    "(id INTEGER PRIMARY KEY CHECK (id = 1), path TEXT NOT NULL, "
                    "size INTEGER NOT NULL, mtime_ns INTEGER NOT NULL)"
                )
                connection.execute(
                    "CREATE TABLE IF NOT EXISTS songs "
                    "(set_id INTEGER PRIMARY KEY, artist TEXT NOT NULL, "
                    "title TEXT NOT NULL, creator TEXT NOT NULL)"
                )
                connection.execute(
                    "CREATE TABLE IF NOT EXISTS archives "
                    "(songs_dir TEXT NOT NULL, set_id INTEGER NOT NULL, "
                    "artist TEXT NOT NULL, title TEXT NOT NULL, creator TEXT NOT NULL, "
                    "PRIMARY KEY (songs_dir, set_id))"
                )
                connection.execute(
                    "CREATE TABLE IF NOT EXISTS archive_state "
                    "(path TEXT PRIMARY KEY, mtime_ns INTEGER NOT NULL)"
                )
                connection.commit()
                self._schema_ready = True
                return connection
            except sqlite3.DatabaseError:
                connection.close()
                raise

    @staticmethod
    def source_signature(source: Path) -> tuple[str, int, int]:
        stat = source.stat()
        return str(source.resolve()), stat.st_size, stat.st_mtime_ns

    def load_songs(self, source: Path) -> set[int] | None:
        if not self.path.exists():
            return None
        try:
            signature = self.source_signature(source)
            with closing(self._connect()) as connection:
                row = connection.execute(
                    "SELECT path, size, mtime_ns FROM source WHERE id = 1"
                ).fetchone()
                if row != signature:
                    return None
                owned = {
                    set_id
                    for (set_id,) in connection.execute("SELECT set_id FROM songs")
                }
                return owned if self.source_signature(source) == signature else None
        except (OSError, sqlite3.DatabaseError):
            return None

    def song_metadata(self, set_id: int) -> tuple[int, str, str, str] | None:
        if not self.path.exists():
            return None
        try:
            with closing(self._connect()) as connection:
                row = connection.execute(
                    "SELECT set_id, artist, title, creator FROM songs WHERE set_id = ?",
                    (set_id,),
                ).fetchone()
                if row is None:
                    return None
                song_id, artist, title, creator = row
                return song_id, artist, title, creator
        except (OSError, sqlite3.DatabaseError):
            return None

    def save_songs(
        self,
        source: Path,
        signature: tuple[str, int, int],
        metadata: dict[int, tuple[int, str, str, str]],
    ) -> None:
        try:
            if self.source_signature(source) != signature:
                return
            with closing(self._connect()) as connection:
                with connection:
                    connection.execute("DELETE FROM songs")
                    connection.executemany(
                        "INSERT INTO songs VALUES (?, ?, ?, ?)", metadata.values()
                    )
                    if self.source_signature(source) == signature:
                        connection.execute(
                            "INSERT OR REPLACE INTO source VALUES (1, ?, ?, ?)",
                            signature,
                        )
                    else:
                        connection.execute("DELETE FROM source")
        except (OSError, sqlite3.DatabaseError):
            logger.exception("Failed to save osu!.db index")

    def load_archives(self, songs_dir: Path) -> set[int] | None:
        if not self.path.exists():
            return None
        try:
            source_path = str(songs_dir.resolve())
            mtime_ns = songs_dir.stat().st_mtime_ns
            with closing(self._connect()) as connection:
                row = connection.execute(
                    "SELECT mtime_ns FROM archive_state WHERE path = ?",
                    (source_path,),
                ).fetchone()
                if row != (mtime_ns,):
                    return None
                owned = {
                    set_id
                    for (set_id,) in connection.execute(
                        "SELECT set_id FROM archives WHERE songs_dir = ?",
                        (source_path,),
                    )
                }
                return owned if songs_dir.stat().st_mtime_ns == mtime_ns else None
        except (OSError, sqlite3.DatabaseError):
            return None

    def archive_metadata(
        self, songs_dir: Path, set_id: int
    ) -> tuple[int, str, str, str] | None:
        try:
            with closing(self._connect()) as connection:
                row = connection.execute(
                    "SELECT set_id, artist, title, creator FROM archives "
                    "WHERE songs_dir = ? AND set_id = ?",
                    (str(songs_dir.resolve()), set_id),
                ).fetchone()
                if row is None:
                    return None
                archive_id, artist, title, creator = row
                return archive_id, artist, title, creator
        except (OSError, sqlite3.DatabaseError):
            return None

    def save_archives(
        self,
        songs_dir: Path,
        mtime_ns: int,
        metadata: dict[int, tuple[int, str, str, str]],
    ) -> None:
        try:
            if songs_dir.stat().st_mtime_ns != mtime_ns:
                return
            source_path = str(songs_dir.resolve())
            with closing(self._connect()) as connection:
                with connection:
                    connection.execute(
                        "DELETE FROM archives WHERE songs_dir = ?", (source_path,)
                    )
                    connection.executemany(
                        "INSERT INTO archives VALUES (?, ?, ?, ?, ?)",
                        ((source_path, *fields) for fields in metadata.values()),
                    )
                    if songs_dir.stat().st_mtime_ns == mtime_ns:
                        connection.execute(
                            "INSERT OR REPLACE INTO archive_state VALUES (?, ?)",
                            (source_path, mtime_ns),
                        )
                    else:
                        connection.execute(
                            "DELETE FROM archive_state WHERE path = ?",
                            (source_path,),
                        )
        except (OSError, sqlite3.DatabaseError):
            logger.exception("Failed to save archive index")

    def add_archive(
        self, songs_dir: Path, set_id: int, metadata: tuple[int, str, str, str] | None
    ) -> None:
        try:
            source_path = str(songs_dir.resolve())
            with closing(self._connect()) as connection:
                with connection:
                    connection.execute(
                        "INSERT OR REPLACE INTO archives VALUES (?, ?, ?, ?, ?)",
                        (source_path, *(metadata or (set_id, "", "", ""))),
                    )
        except (OSError, sqlite3.DatabaseError):
            logger.exception("Failed to record downloaded archive")
