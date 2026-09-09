def get_token_for(client, name, email):
    res = client.post("/auth/register", json={
        "name": name,
        "email": email,
        "password": "password123",
        "confirm_password": "password123"
    })
    return res.json()["access_token"]

def test_connection_workflow_and_authorization(client):
    token_alice = get_token_for(client, "Alice", "alice_conn@example.com")
    token_bob = get_token_for(client, "Bob", "bob_conn@example.com")
    token_eve = get_token_for(client, "Eve", "eve@example.com")

    headers_alice = {"Authorization": f"Bearer {token_alice}"}
    headers_bob = {"Authorization": f"Bearer {token_bob}"}
    headers_eve = {"Authorization": f"Bearer {token_eve}"}

    # 1. Alice creates invitation
    inv_res = client.post("/connections/invite", json={"expires_in_minutes": 30}, headers=headers_alice)
    assert inv_res.status_code == 201
    code = inv_res.json()["code"]

    # 2. Bob redeems code
    accept_res = client.post("/connections/accept", json={"code": code}, headers=headers_bob)
    assert accept_res.status_code == 200
    conn_id = accept_res.json()["id"]
    assert accept_res.json()["status"] == "PENDING"

    # 3. Alice approves connection
    approve_res = client.post(f"/connections/approve/{conn_id}", headers=headers_alice)
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "ACCEPTED"

    # 4. Alice starts tracking
    session_res = client.post("/tracking/start", json={"duration_type": "1h"}, headers=headers_alice)
    session_id = session_res.json()["id"]

    # 5. Alice posts location
    loc_payload = {
        "session_id": session_id,
        "latitude": 37.7749,
        "longitude": -122.4194,
        "accuracy": 5.0,
        "speed": 1.5,
        "heading": 90.0
    }
    loc_res = client.post("/locations", json=loc_payload, headers=headers_alice)
    assert loc_res.status_code == 201

    # 6. Bob (approved connection) fetches latest location -> SUCCESS
    bob_view = client.get(f"/locations/latest/{session_id}", headers=headers_bob)
    assert bob_view.status_code == 200
    assert bob_view.json()["latitude"] == 37.7749

    # 7. Eve (unapproved user) tries to fetch latest location -> FORBIDDEN 403
    eve_view = client.get(f"/locations/latest/{session_id}", headers=headers_eve)
    assert eve_view.status_code == 403

def test_cannot_post_location_without_active_session(client):
    token_dave = get_token_for(client, "Dave", "dave_loc@example.com")
    headers_dave = {"Authorization": f"Bearer {token_dave}"}

    loc_payload = {
        "latitude": 40.7128,
        "longitude": -74.0060,
        "accuracy": 10.0
    }
    res = client.post("/locations", json=loc_payload, headers=headers_dave)
    assert res.status_code == 400
