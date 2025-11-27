from typing import List

from pydantic import BaseModel


class Group(BaseModel):
    number: int
    connector: str = "and"  # and/or
    not_: bool = False
    parent: int = 0


class Rule(BaseModel):
    type: str = "number"
    value: str
    field: str
    operator: str
    group: int = 0


class FilterRequest(BaseModel):
    groups: List[Group]
    rules: List[Rule]
