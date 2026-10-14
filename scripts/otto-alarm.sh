#!/usr/bin/env bash
# Agenda Otto - Alarm Daemon Controller

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DAEMON_SCRIPT="$PROJECT_DIR/daemon/otto_alarm.py"
PID_FILE="/tmp/otto_alarm_daemon.pid"
LOG_FILE="/tmp/otto_alarm_daemon.log"
SERVICE_NAME="otto-alarm.service"

is_service_active() {
    systemctl --user is-active --quiet "$SERVICE_NAME" 2>/dev/null
}

start() {
    URL_ARG="$1"

    if is_service_active; then
        echo "🟢 O serviço systemd do Agenda Otto já está ATIVO."
        systemctl --user status "$SERVICE_NAME" --no-pager
        return 0
    fi

    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "⚠️  O Daemon do Agenda Otto já está rodando (PID: $(cat "$PID_FILE"))."
        return 0
    fi

    echo "🚀 Iniciando o Daemon de Alarmes do Agenda Otto..."
    export DISPLAY="${DISPLAY:-:0}"
    export WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}"
    export PYTHONUNBUFFERED=1

    ARGS=""
    if [ -n "$URL_ARG" ]; then
        ARGS="--url $URL_ARG"
        echo "🌐 Conectando à URL: $URL_ARG"
    fi

    nohup python3 "$DAEMON_SCRIPT" $ARGS >> "$LOG_FILE" 2>&1 &
    PID=$!
    echo $PID > "$PID_FILE"
    sleep 1

    if kill -0 "$PID" 2>/dev/null; then
        echo "✅ Daemon iniciado com sucesso! (PID: $PID)"
        echo "📋 Logs: $LOG_FILE"
    else
        echo "❌ Falha ao iniciar daemon. Verifique os logs em $LOG_FILE."
    fi
}

stop() {
    if is_service_active; then
        echo "🛑 Parando serviço systemd..."
        systemctl --user stop "$SERVICE_NAME"
    fi

    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "🛑 Parando processo (PID: $PID)..."
            kill "$PID"
            rm -f "$PID_FILE"
        fi
        rm -f "$PID_FILE"
    fi

    pkill -f "python3.*otto_alarm.py" 2>/dev/null && echo "✅ Processo antigo encerrado." || echo "ℹ️  Nenhum processo manual rodando."
}

status() {
    if is_service_active; then
        echo "🟢 Serviço systemd ATIVO e rodando em segundo plano."
        systemctl --user status "$SERVICE_NAME" --no-pager -n 5
        return 0
    fi

    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "🟢 Daemon ATIVO (PID: $(cat "$PID_FILE"))."
        tail -n 10 "$LOG_FILE" 2>/dev/null
    else
        echo "🔴 Daemon INATIVO."
    fi
}

install_service() {
    SERVICE_DIR="$HOME/.config/systemd/user"
    SERVICE_FILE="$SERVICE_DIR/$SERVICE_NAME"
    mkdir -p "$SERVICE_DIR"

    cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=Agenda Otto Desktop Impact Alarm Daemon
After=graphical-session.target

[Service]
Type=simple
Environment=DISPLAY=:0
Environment=WAYLAND_DISPLAY=wayland-0
Environment=PYTHONUNBUFFERED=1
ExecStart=/bin/bash -c "cd '$PROJECT_DIR' && exec /usr/bin/python3 '$DAEMON_SCRIPT'"
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
EOF

    systemctl --user daemon-reload
    systemctl --user enable "$SERVICE_NAME"
    systemctl --user restart "$SERVICE_NAME"
    echo "✅ Serviço systemd instalado e iniciado com sucesso!"
    echo "💡 O daemon agora iniciará automaticamente sempre que você fizer login no Ubuntu."
}

case "$1" in
    start)
        start "$2"
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        sleep 1
        start "$2"
        ;;
    status)
        status
        ;;
    autostart)
        install_service
        ;;
    *)
        echo "Uso: $0 {start|stop|restart|status|autostart} [URL_OPCIONAL]"
        exit 1
        ;;
esac
