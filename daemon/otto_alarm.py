#!/usr/bin/env python3
"""
Agenda Otto - Desktop Native Impact Alarm Daemon
Monitors alarms from Agenda Otto and creates full-screen, always-on-top, vibrant visual interruption
across all connected displays in Ubuntu/GNOME.
"""

import os
import sys
import re
import json
import time

try:
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)
except Exception:
    pass
import subprocess
import urllib.request
import urllib.error
from datetime import datetime
import tkinter as tk
from tkinter import font as tkfont

# Determine project directory and load .env if available
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE = os.path.join(PROJECT_DIR, ".env")

def load_env():
    env_vars = {}
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    val = val.strip().strip('"').strip("'")
                    env_vars[key.strip()] = val
    return env_vars

import argparse

parser = argparse.ArgumentParser(description="Agenda Otto Impact Alarm Daemon")
parser.add_argument("--url", help="Agenda Otto Base URL")
args, _ = parser.parse_known_args()

env_config = load_env()
BASE_URL = args.url or os.environ.get("AGENDA_URL") or env_config.get("AGENDA_URL") or env_config.get("NEXTAUTH_URL") or "http://localhost:3000"
DAEMON_TOKEN = os.environ.get("ALARM_DAEMON_TOKEN") or env_config.get("ALARM_DAEMON_TOKEN") or "otto_daemon_secret_2026"

# Track already triggered alarms in the current minute: "alarmId_YYYY-MM-DD_HH:MM"
triggered_keys = set()
active_alert_windows = []

def get_monitors():
    """Detects all physical monitors and their offsets via xrandr."""
    monitors = []
    try:
        output = subprocess.check_output(["xrandr", "--listmonitors"]).decode("utf-8")
        for line in output.splitlines():
            match = re.search(r"\d+:\s+\S*\s+(\d+)/\d+x(\d+)/\d+\+(\d+)\+(\d+)\s+(\S+)", line)
            if match:
                w, h, x, y, name = match.groups()
                monitors.append({
                    "name": name,
                    "w": int(w),
                    "h": int(h),
                    "x": int(x),
                    "y": int(y)
                })
    except Exception as e:
        print("[Daemon] Error querying xrandr:", e)
    
    if not monitors:
        # Fallback to single primary screen
        monitors.append({"name": "primary", "w": 1920, "h": 1080, "x": 0, "y": 0})
    return monitors

def api_request(endpoint, method="GET", data=None):
    """Performs HTTP request to the Agenda Otto API."""
    url = f"{BASE_URL.rstrip('/')}{endpoint}"
    headers = {
        "Authorization": f"Bearer {DAEMON_TOKEN}",
        "Content-Type": "application/json"
    }
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as err:
        return None

def show_impact_alarm(root, alarm):
    """Spawns full-screen, topmost, vibrant alarm window on every monitor."""
    global active_alert_windows
    
    # Close any existing open alert windows first
    close_all_alert_windows()
    
    title = alarm.get("title", "ALARME AGENDADO")
    message = alarm.get("message") or ""
    bg_color = alarm.get("color") or "#ef4444"
    alarm_id = alarm.get("id")
    is_test = alarm.get("isTest", False)

    monitors = get_monitors()
    print(f"[Daemon] 🚨 FIRING ALARM '{title}' across {len(monitors)} monitor(s) with color {bg_color}")

    def on_dismiss(event=None):
        if not is_test and alarm_id:
            api_request("/api/alarms", method="POST", data={"action": "dismiss", "alarmId": alarm_id})
        close_all_alert_windows()

    def on_snooze(event=None):
        if not is_test and alarm_id:
            api_request("/api/alarms", method="POST", data={"action": "snooze", "alarmId": alarm_id, "minutes": 5})
        close_all_alert_windows()

    for mon in monitors:
        win = tk.Toplevel(root)
        active_alert_windows.append(win)

        # Multi-monitor positioning and absolute topmost configuration
        win.geometry(f"{mon['w']}x{mon['h']}+{mon['x']}+{mon['y']}")
        win.overrideredirect(True)
        win.attributes("-topmost", True)
        win.configure(bg=bg_color)

        # Central container card
        frame = tk.Frame(win, bg=bg_color, padx=40, pady=40)
        frame.place(relx=0.5, rely=0.5, anchor="center")

        # Top Badge
        badge_text = "⚡ TESTE VISUAL" if is_test else f"⏰ AGENDA EDU • {alarm.get('time', '')}"
        lbl_badge = tk.Label(
            frame, 
            text=f"  {badge_text}  ", 
            font=("Ubuntu", 14, "bold"), 
            bg="#ffffff", 
            fg=bg_color, 
            padx=12, 
            pady=4
        )
        lbl_badge.pack(pady=(0, 25))

        # Big Title
        lbl_title = tk.Label(
            frame, 
            text=title.upper(), 
            font=("Ubuntu", 42, "bold"), 
            fg="#ffffff", 
            bg=bg_color,
            wraplength=int(mon["w"] * 0.8),
            justify="center"
        )
        lbl_title.pack(pady=(0, 20))

        # Message description
        if message:
            lbl_msg = tk.Label(
                frame, 
                text=message, 
                font=("Ubuntu", 20, "normal"), 
                fg="#fefefe", 
                bg=bg_color,
                wraplength=int(mon["w"] * 0.7),
                justify="center"
            )
            lbl_msg.pack(pady=(0, 35))
        else:
            lbl_title.pack(pady=(0, 35))

        # Action Buttons frame
        btn_frame = tk.Frame(frame, bg=bg_color)
        btn_frame.pack(pady=10)

        # Dismiss Button
        btn_dismiss = tk.Button(
            btn_frame,
            text="  ✅  ENTENDIDO (Enter)  ",
            font=("Ubuntu", 16, "bold"),
            bg="#ffffff",
            fg="#111827",
            activebackground="#f3f4f6",
            activeforeground="#000000",
            relief="flat",
            cursor="hand2",
            padx=20,
            pady=12,
            command=on_dismiss
        )
        btn_dismiss.pack(side="left", padx=12)

        # Snooze Button
        if not is_test:
            btn_snooze = tk.Button(
                btn_frame,
                text="  ⏱️  ADIAR 5 MINUTOS (Espaço)  ",
                font=("Ubuntu", 16, "bold"),
                bg="#1f2937",
                fg="#ffffff",
                activebackground="#374151",
                activeforeground="#ffffff",
                relief="flat",
                cursor="hand2",
                padx=20,
                pady=12,
                command=on_snooze
            )
            btn_snooze.pack(side="left", padx=12)

        # Key bindings
        win.bind("<Return>", on_dismiss)
        win.bind("<KP_Enter>", on_dismiss)
        win.bind("<Escape>", on_dismiss)
        if not is_test:
            win.bind("<space>", on_snooze)

        # Force window to top and gain focus
        win.lift()
        win.focus_force()

def close_all_alert_windows():
    global active_alert_windows
    for win in active_alert_windows:
        try:
            win.destroy()
        except Exception:
            pass
    active_alert_windows = []

def check_alarms_loop(root):
    """Periodic check for upcoming alarms or immediate triggers."""
    global triggered_keys

    now = datetime.now()
    current_hh_mm = now.strftime("%H:%M")
    current_weekday = now.weekday() # 0 = Monday, 6 = Sunday
    # Convert to standard JS getDay: 0 = Sun, 1 = Mon, ..., 6 = Sat
    js_weekday = (current_weekday + 1) % 7
    today_str = now.strftime("%Y-%m-%d")

    data = api_request("/api/alarms")
    if data:
        # 1. Immediate trigger (e.g. from UI "Testar Alarme" button)
        imm = data.get("immediateTrigger")
        if imm:
            show_impact_alarm(root, imm)

        # 2. Check scheduled alarms
        alarms = data.get("alarms", [])
        for alarm in alarms:
            alarm_id = alarm.get("id")
            alarm_time = alarm.get("time") # "HH:mm"
            days = alarm.get("daysOfWeek") or []
            snooze_until = alarm.get("snoozeUntil")

            should_trigger = False

            # Case A: Snoozed alarm time reached
            if snooze_until:
                try:
                    snooze_dt = datetime.fromisoformat(snooze_until.replace("Z", "+00:00"))
                    # If local or UTC timestamp passed
                    if datetime.now(snooze_dt.tzinfo) >= snooze_dt:
                        trigger_key = f"{alarm_id}_snooze_{snooze_until}"
                        if trigger_key not in triggered_keys:
                            triggered_keys.add(trigger_key)
                            should_trigger = True
                except Exception as err:
                    print("[Daemon] Error parsing snooze:", err)

            # Case B: Scheduled time matches current minute
            elif alarm_time == current_hh_mm:
                trigger_key = f"{alarm_id}_{today_str}_{current_hh_mm}"
                if trigger_key not in triggered_keys:
                    # Check day of week (empty means all days)
                    if len(days) == 0 or js_weekday in days:
                        triggered_keys.add(trigger_key)
                        should_trigger = True

            if should_trigger:
                show_impact_alarm(root, alarm)

    # Clean old triggered_keys (keep set small)
    if len(triggered_keys) > 1000:
        triggered_keys.clear()

    # Schedule next check in 10 seconds
    root.after(10000, lambda: check_alarms_loop(root))

def main():
    print(f"==================================================")
    print(f"  Agenda Otto - Native Impact Alarm Daemon")
    print(f"  Connected to: {BASE_URL}")
    print(f"  Monitors detected: {len(get_monitors())}")
    for m in get_monitors():
        print(f"    - {m['name']}: {m['w']}x{m['h']} at ({m['x']},{m['y']})")
    print(f"==================================================")

    root = tk.Tk()
    root.withdraw() # Hide root window, only show fullscreen alerts when triggered

    # Start polling
    root.after(1000, lambda: check_alarms_loop(root))

    try:
        root.mainloop()
    except KeyboardInterrupt:
        print("\n[Daemon] Exiting...")
        close_all_alert_windows()
        sys.exit(0)

if __name__ == "__main__":
    main()
