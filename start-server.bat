@echo off
title ABCD Assessment Portal Server
echo =======================================================
echo    Starting ABCD Assessment Portal Backend Server...
echo =======================================================
echo.

set AGY_NODE="C:\Users\STUDENT\AppData\Roaming\Antigravity\bin\agy-node.cmd"

if exist %AGY_NODE% (
    call %AGY_NODE% server.js
) else (
    node server.js
)

pause
