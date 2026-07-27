from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from ..core.security import hash_password, is_password_hash
from ..repositories import CustomerRepository, EngineerRepository, JobTitleRepository
from .common import payload, status_value

class CustomerService:
    def __init__(self) -> None:
        self.repo = CustomerRepository()

    def list(self): return self.repo.list()
    def get(self, item_id: int): return self.repo.get(item_id)
    def create(self, data): return self.repo.create(payload(data))
    def update(self, item_id: int, data): return self.repo.update(item_id, payload(data))
    def delete(self, item_id: int):
        current = self.repo.get(item_id)
        if status_value(current.get("status")) == "closed":
            raise HTTPException(status_code=400, detail="Closed work orders cannot be deleted")
        return self.repo.delete(item_id)


class EngineerService:
    def __init__(self) -> None:
        self.repo = EngineerRepository()

    def list(self): return self.repo.list()
    def get(self, item_id: int): return self.repo.get(item_id)
    def create(self, data):
        item = self._prepare_payload(payload(data))
        return self.repo.create(item)

    def update(self, item_id: int, data):
        item = self._prepare_payload(payload(data), updating=True)
        return self.repo.update(item_id, item)
    def delete(self, item_id: int): return self.repo.delete(item_id)

    def _prepare_payload(self, item: dict[str, Any], updating: bool = False) -> dict[str, Any]:
        password = item.get("password")
        if password is None:
            return item
        if updating and password == "":
            item.pop("password", None)
            return item
        if password and not is_password_hash(password):
            item["password"] = hash_password(password)
        return item


class JobTitleService:
    def __init__(self) -> None:
        self.repo = JobTitleRepository()

    def list(self): return self.repo.list()
    def get(self, item_id: int): return self.repo.get(item_id)
    def create(self, data): return self.repo.create(payload(data))
    def update(self, item_id: int, data): return self.repo.update(item_id, payload(data))
    def delete(self, item_id: int): return self.repo.delete(item_id)

