from datetime import datetime, timedelta, timezone

def get_auth_header(client, name="Test User", email="user@example.com"):
    res = client.post("/auth/register", json={
        "name": name,
        "email": email,
        "password": "password123",
        "confirm_password": "password123"
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_start_tracking_preset_duration(client):
    headers = get_auth_header(client, "Sharer One", "sharer1@example.com")
    payload = {"duration_type": "1h"}
    res = client.post("/tracking/start", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "ACTIVE"
    assert data["remaining_seconds"] > 3500 and data["remaining_seconds"] <= 3600

def test_start_tracking_custom_duration(client):
    headers = get_auth_header(client, "Sharer Two", "sharer2@example.com")
    payload = {
        "duration_type": "custom_duration",
        "custom_hours": 3,
        "custom_minutes": 45
    }
    res = client.post("/tracking/start", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "ACTIVE"
    # 3 hours 45 mins = 13500 seconds
    assert data["remaining_seconds"] > 13400 and data["remaining_seconds"] <= 13500

def test_stop_tracking_session(client):
    headers = get_auth_header(client, "Sharer Three", "sharer3@example.com")
    start_res = client.post("/tracking/start", json={"duration_type": "30m"}, headers=headers)
    session_id = start_res.json()["id"]

    stop_res = client.post(f"/tracking/stop?session_id={session_id}", headers=headers)
    assert stop_res.status_code == 200
    assert stop_res.json()["status"] == "STOPPED"
    assert stop_res.json()["remaining_seconds"] == 0
