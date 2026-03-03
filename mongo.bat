@echo off
REM MongoDB Docker Helper Script for Windows
REM Usage: mongo.bat [command]

setlocal enabledelayedexpansion

if "%1"=="" (
  set "COMMAND=help"
) else (
  set "COMMAND=%1"
)

if "%COMMAND%"=="start" (
  echo 🚀 Starting MongoDB container...
  docker-compose up -d
  echo ⏳ Waiting for MongoDB to be ready...
  timeout /t 3 /nobreak
  docker-compose ps
  echo ✅ MongoDB is running!
  echo 📍 Connection: mongodb://admin:admin123@localhost:27017/elearning
  goto :end
)

if "%COMMAND%"=="stop" (
  echo 🛑 Stopping MongoDB container...
  docker-compose down
  echo ✅ MongoDB stopped!
  goto :end
)

if "%COMMAND%"=="restart" (
  echo 🔄 Restarting MongoDB container...
  docker-compose restart mongo
  echo ⏳ Waiting for MongoDB to be ready...
  timeout /t 3 /nobreak
  echo ✅ MongoDB restarted!
  goto :end
)

if "%COMMAND%"=="logs" (
  echo 📋 MongoDB logs:
  docker-compose logs mongo -f
  goto :end
)

if "%COMMAND%"=="shell" (
  echo 🐚 Opening MongoDB shell...
  docker exec -it mongo mongosh -u admin -p admin123 --authenticationDatabase admin
  goto :end
)

if "%COMMAND%"=="status" (
  echo 📊 MongoDB status:
  docker-compose ps
  goto :end
)

if "%COMMAND%"=="clean" (
  echo 🗑️  Removing MongoDB container and data...
  docker-compose down -v
  echo ✅ Cleaned up!
  goto :end
)

if "%COMMAND%"=="reset" (
  echo 🔄 Resetting MongoDB (remove container and data)...
  docker-compose down -v
  echo 🚀 Starting fresh MongoDB container...
  docker-compose up -d
  timeout /t 3 /nobreak
  echo ✅ MongoDB reset complete!
  goto :end
)

if "%COMMAND%"=="inspect" (
  echo 🔍 MongoDB container details:
  docker inspect mongo
  goto :end
)

if "%COMMAND%"=="volumes" (
  echo 📦 MongoDB volumes:
  docker volume ls | findstr mongo
  goto :end
)

echo MongoDB Docker Helper
echo.
echo Usage: %0 [command]
echo.
echo Commands:
echo   start     - Start MongoDB container
echo   stop      - Stop MongoDB container
echo   restart   - Restart MongoDB container
echo   logs      - View MongoDB logs (live)
echo   shell     - Open MongoDB shell
echo   status    - Show container status
echo   clean     - Remove container and data
echo   reset     - Reset MongoDB (clean + fresh start)
echo   inspect   - Show container details
echo   volumes   - List MongoDB volumes
echo   help      - Show this help message
echo.
echo Examples:
echo   %0 start      # Start MongoDB
echo   %0 logs       # View live logs
echo   %0 shell      # Open MongoDB shell
echo.

:end
endlocal
