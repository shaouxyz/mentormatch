@echo off
REM Use Node from Program Files so Expo works (avoids Miniconda/other Node)
set "PATH=C:\Program Files\nodejs;%PATH%"
call npx expo start %*
