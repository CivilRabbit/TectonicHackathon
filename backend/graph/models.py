from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator

ViewerCountry = Literal["BE", "NL"]
SourceType = Literal["doc", "teams", "email"]
EdgeType = Literal["supersedes", "contradicts", "references"]
ConflictReason = Literal["value_mismatch", "scope_mismatch", "unofficial_vs_official"]
Severity = Literal["high", "medium", "low"]
ID_PATTERN = r"^[a-zA-Z0-9_-]+$"


class Claim(BaseModel):
    model_config = ConfigDict(extra="forbid")
    topic: str = Field(min_length=1, max_length=128)
    value: str = Field(min_length=1, max_length=64)


class Source(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(pattern=ID_PATTERN, max_length=64)
    type: SourceType
    title: str = Field(min_length=1, max_length=200)
    date: date
    owner: str | None = Field(default=None, max_length=80)
    country: Literal["BE", "NL", "ALL"]
    body: str = Field(default="", max_length=2000)
    claims: list[Claim] = Field(min_length=1, max_length=10)
    supersedesIds: list[str] = Field(default_factory=list, max_length=20)
    referencesIds: list[str] = Field(default_factory=list, max_length=20)


class SourceCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: SourceType
    title: str = Field(min_length=1, max_length=200)
    date: date
    owner: str | None = Field(default=None, max_length=80)
    country: Literal["BE", "NL", "ALL"]
    body: str = Field(default="", max_length=2000)
    claims: list[Claim] = Field(min_length=1, max_length=10)
    supersedesIds: list[str] = Field(default_factory=list, max_length=20)
    referencesIds: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("supersedesIds", "referencesIds")
    @classmethod
    def ids_pattern(cls, v: list[str]) -> list[str]:
        for item in v:
            if len(item) > 64 or not all(c.isalnum() or c in "-_" for c in item):
                raise ValueError("invalid source id")
        return v


class Edge(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    id: str
    from_: str = Field(
        validation_alias=AliasChoices("from", "from_"),
        serialization_alias="from",
    )
    to: str
    type: EdgeType


class Conflict(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    sourceIds: list[str] = Field(min_length=2, max_length=2)
    topic: str
    reason: ConflictReason
    severity: Severity


class Factor(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    label: str
    delta: float
    detail: str


class TrustBreakdown(BaseModel):
    model_config = ConfigDict(extra="forbid")
    score: int = Field(ge=0, le=100)
    factors: list[Factor]


class GraphResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    country: ViewerCountry
    nodes: list[Source]
    edges: list[Edge]
    conflicts: list[Conflict]
    trust: dict[str, TrustBreakdown]


class TrustChange(BaseModel):
    model_config = ConfigDict(extra="forbid")
    before: int
    after: int


class GraphDiff(BaseModel):
    model_config = ConfigDict(extra="forbid")
    addedNodes: list[Source]
    addedEdges: list[Edge]
    newConflicts: list[Conflict]
    resolvedConflicts: list[Conflict]
    changedTrust: dict[str, TrustChange]


class SourceDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: Source
    trust: TrustBreakdown
    scopeMatch: bool


class AddSourceResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: Source
    diff: GraphDiff
    graph: GraphResponse
