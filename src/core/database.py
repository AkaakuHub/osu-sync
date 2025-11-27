import sqlite3
import threading
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Metadata型をここで定義して循環インポートを回避
Metadata = Tuple[int, str, str, str]  # (beatmapset_id, artist, title, creator)


class SongDatabase:
    """
    SQLiteを使った楽曲インデックスの永続化レイヤ
    """

    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._init_schema()

    def _init_schema(self) -> None:
        """データベーススキーマを初期化"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS songs (
                    set_id INTEGER PRIMARY KEY,
                    artist TEXT,
                    title TEXT,
                    creator TEXT,
                    file_path TEXT,
                    file_size INTEGER,
                    last_modified REAL,
                    created_at REAL DEFAULT (strftime('%s', 'now')),
                    updated_at REAL DEFAULT (strftime('%s', 'now'))
                )
            """)

            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_songs_set_id ON songs(set_id)
            """)

            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_songs_file_path ON songs(file_path)
            """)

            # スキャン状態管理用テーブル
            conn.execute("""
                CREATE TABLE IF NOT EXISTS scan_status (
                    id INTEGER PRIMARY KEY,
                    status TEXT DEFAULT 'idle',  -- idle, scanning, completed, error
                    total_files INTEGER DEFAULT 0,
                    processed_files INTEGER DEFAULT 0,
                    current_file TEXT,
                    started_at REAL,
                    completed_at REAL,
                    error_message TEXT,
                    updated_at REAL DEFAULT (strftime('%s', 'now'))
                )
            """)

            conn.commit()

    def upsert_song(self, set_id: int, artist: str, title: str, creator: str, file_path: str, file_size: int, last_modified: float) -> None:
        """楽曲情報をUPSERT"""
        with self._lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO songs
                    (set_id, artist, title, creator, file_path, file_size, last_modified, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
                """, (set_id, artist, title, creator, file_path, file_size, last_modified))
                conn.commit()

    def delete_songs_not_in_paths(self, valid_paths: List[str]) -> int:
        """有効なパスリストに含まれない楽曲を削除"""
        with self._lock:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("""
                    DELETE FROM songs WHERE file_path NOT IN ({})
                """.format(','.join(['?' for _ in valid_paths])), valid_paths)
                deleted_count = cursor.rowcount
                conn.commit()
                return deleted_count

    def delete_all_songs(self) -> int:
        """全楽曲エントリを削除"""
        with self._lock:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("DELETE FROM songs")
                deleted_count = cursor.rowcount
                conn.commit()
                return deleted_count

    def get_all_songs(self) -> Dict[int, Metadata]:
        """すべての楽曲情報を取得"""
        with self._lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute("""
                    SELECT set_id, artist, title, creator
                    FROM songs
                    ORDER BY set_id
                """)
                result = {}
                for row in cursor.fetchall():
                    result[row['set_id']] = (
                        row['set_id'], row['artist'], row['title'], row['creator']
                    )
                return result

    def get_owned_set_ids(self) -> set[int]:
        """所有しているセットID一覧を取得"""
        with self._lock:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("SELECT set_id FROM songs")
                return {row[0] for row in cursor.fetchall()}

    def start_scan(self, total_files: int = 0) -> None:
        """スキャンを開始"""
        with self._lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO scan_status
                    (id, status, total_files, processed_files, started_at, updated_at)
                    VALUES (1, 'scanning', ?, 0, strftime('%s', 'now'), strftime('%s', 'now'))
                """, (total_files,))
                conn.commit()

    def update_scan_progress(self, processed_files: int, current_file: Optional[str] = None) -> None:
        """スキャン進捗を更新"""
        with self._lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    UPDATE scan_status
                    SET processed_files = ?, current_file = ?, updated_at = strftime('%s', 'now')
                    WHERE id = 1
                """, (processed_files, current_file))
                conn.commit()

    def complete_scan(self) -> None:
        """スキャンを完了"""
        with self._lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    UPDATE scan_status
                    SET status = 'completed', completed_at = strftime('%s', 'now'), updated_at = strftime('%s', 'now')
                    WHERE id = 1
                """)
                conn.commit()

    def set_scan_error(self, error_message: str) -> None:
        """スキャンエラーを記録"""
        with self._lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    UPDATE scan_status
                    SET status = 'error', error_message = ?, completed_at = strftime('%s', 'now'), updated_at = strftime('%s', 'now')
                    WHERE id = 1
                """, (error_message,))
                conn.commit()

    def get_scan_status(self) -> Dict[str, any]:
        """スキャン状態を取得"""
        with self._lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute("SELECT * FROM scan_status WHERE id = 1")
                row = cursor.fetchone()
                if row:
                    return dict(row)
                return {
                    'status': 'idle',
                    'total_files': 0,
                    'processed_files': 0,
                    'current_file': None,
                    'started_at': None,
                    'completed_at': None,
                    'error_message': None,
                    'updated_at': None
                }

    def reset_scan_status(self) -> None:
        """スキャン状態をリセット"""
        with self._lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO scan_status
                    (id, status, total_files, processed_files, current_file, started_at, completed_at, error_message, updated_at)
                    VALUES (1, 'idle', 0, 0, NULL, NULL, NULL, NULL, strftime('%s', 'now'))
                """)
                conn.commit()
