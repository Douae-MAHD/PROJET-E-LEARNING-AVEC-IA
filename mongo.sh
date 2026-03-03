#!/bin/bash

# MongoDB Docker Helper Script
# Usage: ./mongo.sh [command]

set -e

COMMAND=${1:-help}

case $COMMAND in
  start)
    echo "🚀 Starting MongoDB container..."
    docker-compose up -d
    echo "⏳ Waiting for MongoDB to be ready..."
    sleep 3
    docker-compose ps
    echo "✅ MongoDB is running!"
    echo "📍 Connection: mongodb://admin:admin123@localhost:27017/elearning"
    ;;

  stop)
    echo "🛑 Stopping MongoDB container..."
    docker-compose down
    echo "✅ MongoDB stopped!"
    ;;

  restart)
    echo "🔄 Restarting MongoDB container..."
    docker-compose restart mongo
    echo "⏳ Waiting for MongoDB to be ready..."
    sleep 3
    echo "✅ MongoDB restarted!"
    ;;

  logs)
    echo "📋 MongoDB logs:"
    docker-compose logs mongo -f
    ;;

  shell)
    echo "🐚 Opening MongoDB shell..."
    docker exec -it mongo mongosh -u admin -p admin123 --authenticationDatabase admin
    ;;

  status)
    echo "📊 MongoDB status:"
    docker-compose ps
    ;;

  clean)
    echo "🗑️  Removing MongoDB container and data..."
    docker-compose down -v
    echo "✅ Cleaned up!"
    ;;

  reset)
    echo "🔄 Resetting MongoDB (remove container and data)..."
    docker-compose down -v
    echo "🚀 Starting fresh MongoDB container..."
    docker-compose up -d
    sleep 3
    echo "✅ MongoDB reset complete!"
    ;;

  inspect)
    echo "🔍 MongoDB container details:"
    docker inspect mongo
    ;;

  volumes)
    echo "📦 MongoDB volumes:"
    docker volume ls | grep mongo
    ;;

  *)
    echo "MongoDB Docker Helper"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start     - Start MongoDB container"
    echo "  stop      - Stop MongoDB container"
    echo "  restart   - Restart MongoDB container"
    echo "  logs      - View MongoDB logs (live)"
    echo "  shell     - Open MongoDB shell"
    echo "  status    - Show container status"
    echo "  clean     - Remove container and data"
    echo "  reset     - Reset MongoDB (clean + fresh start)"
    echo "  inspect   - Show container details"
    echo "  volumes   - List MongoDB volumes"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start      # Start MongoDB"
    echo "  $0 logs       # View live logs"
    echo "  $0 shell      # Open MongoDB shell"
    ;;
esac
