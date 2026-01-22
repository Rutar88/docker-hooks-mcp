import pytest
import requests

API_URL = "http://localhost:3000"


class TestTodosAPI:
    created_todo_id = None

    def test_post_todos_creates_todo(self):
        response = requests.post(f"{API_URL}/todos", json={"title": "test"})

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["title"] == "test"
        TestTodosAPI.created_todo_id = data["id"]

    def test_get_todos_returns_array(self):
        response = requests.get(f"{API_URL}/todos")

        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_delete_todos_removes_todo(self):
        todo_id = TestTodosAPI.created_todo_id or 1
        response = requests.delete(f"{API_URL}/todos/{todo_id}")

        assert response.status_code == 204
