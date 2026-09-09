from typing import Dict, List
import json
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Map session_id to list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def broadcast_to_session(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            payload = json.dumps(message)
            disconnected = []
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_text(payload)
                except Exception:
                    disconnected.append(connection)
            for conn in disconnected:
                self.disconnect(session_id, conn)

manager = ConnectionManager()
