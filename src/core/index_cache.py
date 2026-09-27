import json
import os
import tempfile
from pathlib import Path

IndexData = tuple[set[int], dict[int, tuple[int, str, str, str]]]


class OsuDbIndexCache:
    def __init__(self, path: Path) -> None:
        self.path = path

    def _signature(self, source: Path) -> dict[str, str | int]:
        stat = source.stat()
        return {
            "path": str(source.resolve()),
            "size": stat.st_size,
            "mtime_ns": stat.st_mtime_ns,
        }

    def load(self, source: Path) -> IndexData | None:
        try:
            with self.path.open(encoding="utf-8") as file:
                data = json.load(file)
            if data.get("version") != 1 or data.get("source") != self._signature(
                source
            ):
                return None
            metadata = {
                int(set_id): (int(set_id), *fields)
                for set_id, fields in data["metadata"].items()
            }
            return set(metadata), metadata
        except (OSError, ValueError, TypeError, KeyError, AttributeError):
            return None

    def save(
        self, source: Path, metadata: dict[int, tuple[int, str, str, str]]
    ) -> None:
        try:
            signature = self._signature(source)
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(
                mode="w", encoding="utf-8", dir=self.path.parent, delete=False
            ) as file:
                temporary_path = Path(file.name)
                json.dump(
                    {
                        "version": 1,
                        "source": signature,
                        "metadata": {
                            str(set_id): list(fields[1:])
                            for set_id, fields in metadata.items()
                        },
                    },
                    file,
                    ensure_ascii=False,
                )
            if self._signature(source) == signature:
                os.replace(temporary_path, self.path)
            else:
                temporary_path.unlink()
        except OSError:
            if "temporary_path" in locals():
                temporary_path.unlink(missing_ok=True)


class OszIndexCache:
    def __init__(self, path: Path) -> None:
        self.path = path

    def load(self, songs_dir: Path) -> IndexData | None:
        try:
            with self.path.open(encoding="utf-8") as file:
                data = json.load(file)
            if data.get("version") != 1 or data.get("songs_dir") != str(
                songs_dir.resolve()
            ):
                return None
            directories = data["directories"]
            if "." not in directories:
                return None
            for relative_path, mtime_ns in directories.items():
                relative = Path(relative_path)
                if relative.is_absolute() or ".." in relative.parts:
                    return None
                if (songs_dir / relative).stat().st_mtime_ns != mtime_ns:
                    return None
            metadata = {
                int(set_id): (int(set_id), *fields)
                for set_id, fields in data["metadata"].items()
            }
            return set(metadata), metadata
        except (OSError, ValueError, TypeError, KeyError, AttributeError):
            return None

    def save(
        self,
        songs_dir: Path,
        directories: dict[str, int],
        metadata: dict[int, tuple[int, str, str, str]],
    ) -> None:
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(
                mode="w", encoding="utf-8", dir=self.path.parent, delete=False
            ) as file:
                temporary_path = Path(file.name)
                json.dump(
                    {
                        "version": 1,
                        "songs_dir": str(songs_dir.resolve()),
                        "directories": directories,
                        "metadata": {
                            str(set_id): list(fields[1:])
                            for set_id, fields in metadata.items()
                        },
                    },
                    file,
                    ensure_ascii=False,
                )
            if all(
                (songs_dir / relative_path).stat().st_mtime_ns == mtime_ns
                for relative_path, mtime_ns in directories.items()
            ):
                os.replace(temporary_path, self.path)
            else:
                temporary_path.unlink()
        except OSError:
            if "temporary_path" in locals():
                temporary_path.unlink(missing_ok=True)
