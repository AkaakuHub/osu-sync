# This is a generated file! Please edit source .ksy file and use kaitai-struct-compiler to rebuild

import kaitaistruct
from kaitaistruct import KaitaiStruct, KaitaiStream, BytesIO


if getattr(kaitaistruct, 'API_VERSION', (0, 9)) < (0, 9):
    raise Exception("Incompatible Kaitai Struct Python API: 0.9 or later is required, but you have %s" % (kaitaistruct.__version__))

from . import vlq_base128_le
class OsuCollection(KaitaiStruct):
    """collection.db file format in rhythm game osu!,
    the legacy DB file structure used in the old osu stable client (not lazer).
    
    DB files are in the `osu-stable` installation directory:
    Windows: `%localappdata%\osu!`
    Mac OSX: `/Applications/osu!.app/Contents/Resources/drive_c/Program Files/osu!/`
    
    Unless otherwise specified, all numerical types are stored little-endian.
    Integer values, including bytes, are all unsigned.
    UTF-8 characters are stored in their canonical form, with the higher-order byte first.
    
    collection.db contains the user's beatmap collection data.
    This file can be transferred from one osu! installation to another.
    However, this will not work if the PC does not have all of the collected beatmaps installed.
    
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
        self.num_collections = self._io.read_u4le()
        self.collections = []
        for i in range(self.num_collections):
            self.collections.append(OsuCollection.Collection(self._io, self, self._root))


    class Collection(KaitaiStruct):
        def __init__(self, _io, _parent=None, _root=None):
            self._io = _io
            self._parent = _parent
            self._root = _root if _root else self
            self._read()

        def _read(self):
            self.name = OsuCollection.String(self._io, self, self._root)
            self.num_beatmaps = self._io.read_u4le()
            self.beatmaps_md5s = []
            for i in range(self.num_beatmaps):
                self.beatmaps_md5s.append(OsuCollection.String(self._io, self, self._root))



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
                self.value = (self._io.read_bytes(self.len_str.value)).decode(u"UTF-8")




