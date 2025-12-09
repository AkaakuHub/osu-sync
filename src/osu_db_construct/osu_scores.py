# This is a generated file! Please edit source .ksy file and use kaitai-struct-compiler to rebuild

import kaitaistruct
from kaitaistruct import KaitaiStruct

if getattr(kaitaistruct, "API_VERSION", (0, 9)) < (0, 9):
    raise Exception(
        f"Incompatible Kaitai Struct Python API: 0.9 or later is required, but you have {kaitaistruct.__version__}"
    )

from . import vlq_base128_le


class OsuScores(KaitaiStruct):
    """scores.db file format in rhythm game osu!,
    the legacy DB file structure used in the old osu stable client (not lazer).

    DB files are in the `osu-stable` installation directory:
    Windows: `%localappdata%\osu!`
    Mac OSX: `/Applications/osu!.app/Contents/Resources/drive_c/Program Files/osu!/`

    Unless otherwise specified, all numerical types are stored little-endian.
    Integer values, including bytes, are all unsigned.
    UTF-8 characters are stored in their canonical form, with the higher-order byte first.

    scores.db contains the scores achieved locally.

    .. seealso::
       Source - https://github.com/ppy/osu/wiki/Legacy-database-file-structure
    """

    def __init__(self, _io, _parent=None, _root=None):
        self._io = _io
        self._parent = _parent
        self._root = _root if _root else self
        self._read()

    def _read(self):
        self.version = self._io.read_u4le()
        self.num_beatmaps = self._io.read_u4le()
        self.beatmaps = []
        for i in range(self.num_beatmaps):
            self.beatmaps.append(OsuScores.Beatmap(self._io, self, self._root))

    class Bool(KaitaiStruct):
        """0x00 for false, everything else is true."""

        def __init__(self, _io, _parent=None, _root=None):
            self._io = _io
            self._parent = _parent
            self._root = _root if _root else self
            self._read()

        def _read(self):
            self.byte = self._io.read_u1()

        @property
        def value(self):
            if hasattr(self, "_m_value"):
                return self._m_value

            self._m_value = False if self.byte == 0 else True
            return getattr(self, "_m_value", None)

    class String(KaitaiStruct):
        """Has three parts; a single byte which will be either 0x00, indicating that
        the next two parts are not present, or 0x0b (decimal 11), indicating that
        the next two parts are present.
        If it is 0x0b, there will then be a ULEB128, representing the byte length
        of the following string, and then the string itself, encoded in UTF-8.
        See https://en.wikipedia.org/wiki/UTF-8.
        """

        def __init__(self, _io, _parent=None, _root=None):
            self._io = _io
            self._parent = _parent
            self._root = _root if _root else self
            self._read()

        def _read(self):
            self.is_present = self._io.read_u1()
            if self.is_present == 11:
                self.len_str = vlq_base128_le.VlqBase128Le(self._io)

            if self.is_present == 11:
                self.value = (self._io.read_bytes(self.len_str.value)).decode("UTF-8")

    class Beatmap(KaitaiStruct):
        def __init__(self, _io, _parent=None, _root=None):
            self._io = _io
            self._parent = _parent
            self._root = _root if _root else self
            self._read()

        def _read(self):
            self.md5_hash = OsuScores.String(self._io, self, self._root)
            self.num_scores = self._io.read_u4le()
            self.scores = []
            for i in range(self.num_scores):
                self.scores.append(OsuScores.Score(self._io, self, self._root))

    class Score(KaitaiStruct):
        def __init__(self, _io, _parent=None, _root=None):
            self._io = _io
            self._parent = _parent
            self._root = _root if _root else self
            self._read()

        def _read(self):
            self.gameplay_mode = self._io.read_u1()
            self.version = self._io.read_u4le()
            self.beatmap_md5_hash = OsuScores.String(self._io, self, self._root)
            self.player_name = OsuScores.String(self._io, self, self._root)
            self.replay_md5_hash = OsuScores.String(self._io, self, self._root)
            self.num_300 = self._io.read_u2le()
            self.num_100 = self._io.read_u2le()
            self.num_50 = self._io.read_u2le()
            self.num_gekis = self._io.read_u2le()
            self.num_katus = self._io.read_u2le()
            self.num_miss = self._io.read_u2le()
            self.replay_score = self._io.read_u4le()
            self.max_combo = self._io.read_u2le()
            self.perfect_combo = OsuScores.Bool(self._io, self, self._root)
            self.mods = self._io.read_u4le()
            self.empty = OsuScores.String(self._io, self, self._root)
            self.replay_timestamp = self._io.read_u8le()
            self.minus_one = self._io.read_bytes(4)
            if not self.minus_one == b"\xff\xff\xff\xff":
                raise kaitaistruct.ValidationNotEqualError(
                    b"\xff\xff\xff\xff", self.minus_one, self._io, "/types/score/seq/17"
                )
            self.online_score_id = self._io.read_u8le()
            if (self.mods & (1 << 23)) != 0:
                self.mod_info = self._io.read_f8le()
