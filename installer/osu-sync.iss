[Setup]
AppName=osu-sync
AppVersion=1.0.2
DefaultDirName={pf}\osu-sync
DefaultGroupName=osu-sync
OutputBaseFilename=osu-sync-installer
Compression=lzma
SolidCompression=yes
SetupIconFile=icon\osu-sync.ico

[Files]
Source: "..\build\osu-sync.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\osu-sync"; Filename: "{app}\osu-sync.exe"
Name: "{commondesktop}\osu-sync"; Filename: "{app}\osu-sync.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop icon"; GroupDescription: "Additional icons:"

[Run]
Filename: "{app}\osu-sync.exe"; Description: "Launch osu-sync"; Flags: nowait postinstall skipifsilent
