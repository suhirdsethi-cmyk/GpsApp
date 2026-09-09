def test_register_user_success(client):
    payload = {
        "name": "Alice Sharer",
        "email": "alice@example.com",
        "password": "securepassword123",
        "confirm_password": "securepassword123"
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "alice@example.com"
    assert data["user"]["name"] == "Alice Sharer"

def test_register_password_mismatch(client):
    payload = {
        "name": "Bob Viewer",
        "email": "bob@example.com",
        "password": "password123",
        "confirm_password": "differentpassword"
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 422

def test_login_user_success(client):
    # Register first
    reg_payload = {
        "name": "Charlie",
        "email": "charlie@example.com",
        "password": "password123",
        "confirm_password": "password123"
    }
    client.post("/auth/register", json=reg_payload)

    # Login
    login_payload = {
        "email": "charlie@example.com",
        "password": "password123"
    }
    response = client.post("/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["name"] == "Charlie"

def test_login_invalid_password(client):
    reg_payload = {
        "name": "Dave",
        "email": "dave@example.com",
        "password": "password123",
        "confirm_password": "password123"
    }
    client.post("/auth/register", json=reg_payload)

    response = client.post("/auth/login", json={"email": "dave@example.com", "password": "wrongpassword"})
    assert response.status_code == 401
